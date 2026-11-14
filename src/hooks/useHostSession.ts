import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection, type MediaConnection } from 'peerjs';
import type { ViewerParticipant, DataChannelMessage } from '../types';
import { getHostPeerId } from '../utils/room';
import { PrivacyCurtainStream } from '../utils/curtainCanvas';
import { playKnockChime, playCurtainChime } from '../utils/audioChime';

interface UseHostSessionOptions {
  roomCode: string;
  hostName: string;
  requireApproval: boolean;
}

export function useHostSession({ roomCode, hostName, requireApproval }: UseHostSessionOptions) {
  const [peerReady, setPeerReady] = useState(false);
  const [peerError, setPeerError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isCurtainActive, setIsCurtainActive] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [participants, setParticipants] = useState<ViewerParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; time: string; isHost?: boolean }>>([]);
  const [activeReactions, setActiveReactions] = useState<Array<{ id: string; emoji: string; senderName: string }>>([]);

  const peerRef = useRef<Peer | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const curtainStreamRef = useRef<PrivacyCurtainStream | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const mediaCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const requireApprovalRef = useRef(requireApproval);
  requireApprovalRef.current = requireApproval;

  const isCurtainActiveRef = useRef(isCurtainActive);
  isCurtainActiveRef.current = isCurtainActive;

  // Initialize privacy curtain generator early
  useEffect(() => {
    curtainStreamRef.current = new PrivacyCurtainStream();
    return () => {
      curtainStreamRef.current?.destroy();
      curtainStreamRef.current = null;
    };
  }, []);

  // Broadcast a DataChannel message to all connected viewers
  const broadcast = useCallback((msg: DataChannelMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }, []);

  // Get current active video track (either real screen or curtain)
  const getCurrentVideoTrack = useCallback((): MediaStreamTrack | null => {
    if (isCurtainActiveRef.current && curtainStreamRef.current?.track) {
      return curtainStreamRef.current.track;
    }
    return screenStreamRef.current?.getVideoTracks()[0] || null;
  }, []);

  // Get combined media stream to send to a new peer
  const getOutgoingStream = useCallback((): MediaStream => {
    const stream = new MediaStream();
    const vidTrack = getCurrentVideoTrack();
    if (vidTrack) {
      stream.addTrack(vidTrack);
    }
    // Also include screen audio track if available and not muted
    const audioTrack = screenStreamRef.current?.getAudioTracks()[0];
    if (audioTrack && audioTrack.enabled) {
      stream.addTrack(audioTrack);
    }
    return stream;
  }, [getCurrentVideoTrack]);

  // Call a viewer with current stream
  const callViewer = useCallback((viewerId: string) => {
    if (!peerRef.current || peerRef.current.destroyed) return;
    const outgoingStream = getOutgoingStream();
    if (outgoingStream.getTracks().length === 0) {
      console.warn('No active tracks to call viewer with');
      return;
    }

    // Close existing call if any
    const existingCall = mediaCallsRef.current.get(viewerId);
    if (existingCall) {
      existingCall.close();
    }

    try {
      const call = peerRef.current.call(viewerId, outgoingStream);
      mediaCallsRef.current.set(viewerId, call);

      call.on('close', () => {
        mediaCallsRef.current.delete(viewerId);
      });
      call.on('error', (err) => {
        console.error(`Media call error for ${viewerId}:`, err);
        mediaCallsRef.current.delete(viewerId);
      });
    } catch (err) {
      console.error('Failed to initiate media call to viewer:', err);
    }
  }, [getOutgoingStream]);

  // Approve a knocking viewer
  const approveViewer = useCallback((viewerId: string) => {
    const conn = connectionsRef.current.get(viewerId);
    if (conn && conn.open) {
      conn.send({
        type: 'ACCESS_GRANTED',
        hostName,
        streamActive: !!screenStreamRef.current,
      });
    }

    setParticipants((prev) =>
      prev.map((p) => (p.id === viewerId ? { ...p, status: 'approved' } : p))
    );

    // Call viewer with stream
    if (screenStreamRef.current) {
      callViewer(viewerId);
    }
  }, [hostName, callViewer]);

  // Decline a knocking viewer
  const declineViewer = useCallback((viewerId: string, reason = 'Access declined by host') => {
    const conn = connectionsRef.current.get(viewerId);
    if (conn && conn.open) {
      conn.send({
        type: 'ACCESS_DENIED',
        reason,
      });
      setTimeout(() => conn.close(), 500);
    }
    setParticipants((prev) => prev.filter((p) => p.id !== viewerId));
  }, []);

  // Kick a viewer
  const kickViewer = useCallback((viewerId: string) => {
    const conn = connectionsRef.current.get(viewerId);
    if (conn && conn.open) {
      conn.send({
        type: 'KICK_VIEWER',
        viewerId,
      });
      setTimeout(() => conn.close(), 300);
    }
    const call = mediaCallsRef.current.get(viewerId);
    if (call) {
      call.close();
      mediaCallsRef.current.delete(viewerId);
    }
    setParticipants((prev) => prev.filter((p) => p.id !== viewerId));
  }, []);

  // Toggle Privacy Curtain with WebRTC track replacement
  const togglePrivacyCurtain = useCallback(() => {
    const nextState = !isCurtainActiveRef.current;
    setIsCurtainActive(nextState);
    isCurtainActiveRef.current = nextState;
    playCurtainChime(nextState);

    const replacementTrack = nextState
      ? curtainStreamRef.current?.track
      : screenStreamRef.current?.getVideoTracks()[0];

    if (!replacementTrack) {
      console.warn('No replacement track available for curtain toggle');
      return;
    }

    // Replace track on all active MediaConnection senders
    mediaCallsRef.current.forEach((call) => {
      try {
        const pc = call.peerConnection;
        if (pc) {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(replacementTrack);
          }
        }
      } catch (err) {
        console.error('Error replacing track on peer connection:', err);
      }
    });

    // Notify all viewers via DataChannel
    broadcast({
      type: 'PRIVACY_CURTAIN_STATE',
      active: nextState,
    });
  }, [broadcast]);

  // Toggle Screen Audio Mute
  const toggleAudio = useCallback(() => {
    if (!screenStreamRef.current) return;
    const audioTrack = screenStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioMuted(!audioTrack.enabled);
    }
  }, []);

  // Stop Screen Sharing
  const stopSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsSharing(false);
    setIsCurtainActive(false);

    // Close all media calls
    mediaCallsRef.current.forEach((call) => call.close());
    mediaCallsRef.current.clear();

    broadcast({
      type: 'STREAM_ENDED',
      reason: 'Host stopped screen sharing',
    });
  }, [broadcast]);

  // Start Screen Sharing
  const startSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.contentHint = 'detail';
        // Handle native browser "Stop sharing" button click
        videoTrack.onended = () => {
          stopSharing();
        };
      }

      screenStreamRef.current = stream;
      setIsSharing(true);
      setIsCurtainActive(false);

      const audioTrack = stream.getAudioTracks()[0];
      setIsAudioMuted(!audioTrack || !audioTrack.enabled);

      // Call all already approved/connected viewers
      participants.forEach((p) => {
        if (p.status === 'approved' || p.status === 'connected') {
          callViewer(p.id);
        }
      });

      return true;
    } catch (err) {
      console.error('Failed to getDisplayMedia:', err);
      return false;
    }
  }, [participants, callViewer, stopSharing]);

  // Send a chat message
  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const msg = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: 'host',
      senderName: `${hostName} (Host)`,
      text: text.trim(),
      timestamp: Date.now(),
      isHost: true,
    };

    setChatMessages((prev) => [
      ...prev,
      {
        id: msg.id,
        sender: msg.senderName,
        text: msg.text,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isHost: true,
      },
    ]);

    broadcast({
      type: 'CHAT_MESSAGE',
      ...msg,
    });
  }, [hostName, broadcast]);

  // Initialize PeerJS Host
  useEffect(() => {
    const hostPeerId = getHostPeerId(roomCode);
    let peer: Peer;

    try {
      peer = new Peer(hostPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });
    } catch (err) {
      console.error('Failed to instantiate Peer:', err);
      setPeerError('Failed to initialize WebRTC Peer broker');
      return;
    }

    peerRef.current = peer;

    peer.on('open', () => {
      setPeerReady(true);
      setPeerError(null);
    });

    peer.on('error', (err) => {
      console.error('PeerJS error:', err);
      if (err.type === 'unavailable-id') {
        setPeerError(`Room code "${roomCode}" is already in use by an active host.`);
      } else {
        setPeerError(`WebRTC error: ${err.message || err.type}`);
      }
    });

    // Handle incoming DataConnection (Viewer knock / handshake)
    peer.on('connection', (conn) => {
      connectionsRef.current.set(conn.peer, conn);

      conn.on('data', (data) => {
        try {
          const payload = data as DataChannelMessage;

          if (payload.type === 'REQUEST_ACCESS') {
            const newParticipant: ViewerParticipant = {
              id: payload.viewerId,
              displayName: payload.displayName || 'Anonymous Viewer',
              joinedAt: payload.timestamp || Date.now(),
              status: requireApprovalRef.current ? 'knocking' : 'approved',
            };

            setParticipants((prev) => {
              const filtered = prev.filter((p) => p.id !== newParticipant.id);
              return [...filtered, newParticipant];
            });

            if (requireApprovalRef.current) {
              playKnockChime();
            } else {
              // Auto-approve
              conn.send({
                type: 'ACCESS_GRANTED',
                hostName,
                streamActive: !!screenStreamRef.current,
              });
              if (screenStreamRef.current) {
                callViewer(payload.viewerId);
              }
            }
          } else if (payload.type === 'CHAT_MESSAGE') {
            setChatMessages((prev) => [
              ...prev,
              {
                id: payload.id,
                sender: payload.senderName,
                text: payload.text,
                time: new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isHost: false,
              },
            ]);
            // Relay to other viewers
            broadcast(payload);
          } else if (payload.type === 'REACTION') {
            setActiveReactions((prev) => [
              ...prev,
              { id: payload.id, emoji: payload.emoji, senderName: payload.senderName },
            ]);
            setTimeout(() => {
              setActiveReactions((prev) => prev.filter((r) => r.id !== payload.id));
            }, 3000);
            // Relay reaction to other viewers
            broadcast(payload);
          }
        } catch (e) {
          console.error('Error parsing data message:', e);
        }
      });

      conn.on('close', () => {
        connectionsRef.current.delete(conn.peer);
        setParticipants((prev) => prev.filter((p) => p.id !== conn.peer));
        const call = mediaCallsRef.current.get(conn.peer);
        if (call) {
          call.close();
          mediaCallsRef.current.delete(conn.peer);
        }
      });
    });

    return () => {
      stopSharing();
      connectionsRef.current.forEach((conn) => conn.close());
      connectionsRef.current.clear();
      mediaCallsRef.current.forEach((call) => call.close());
      mediaCallsRef.current.clear();
      peer.destroy();
    };
  }, [roomCode, hostName, broadcast, callViewer, stopSharing]);

  return {
    peerReady,
    peerError,
    isSharing,
    isCurtainActive,
    isAudioMuted,
    participants,
    chatMessages,
    activeReactions,
    screenStream: screenStreamRef.current,
    startSharing,
    stopSharing,
    togglePrivacyCurtain,
    toggleAudio,
    approveViewer,
    declineViewer,
    kickViewer,
    sendChatMessage,
  };
}
