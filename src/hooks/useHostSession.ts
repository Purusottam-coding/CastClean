import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection, type MediaConnection } from 'peerjs';
import type { ViewerParticipant, DataChannelMessage } from '../types';
import { getHostPeerId } from '../utils/room';
import { PrivacyCurtainStream } from '../utils/curtainCanvas';

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

  const peerRef = useRef<Peer | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const curtainStreamRef = useRef<PrivacyCurtainStream | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const mediaCallsRef = useRef<Map<string, MediaConnection>>(new Map());

  const requireApprovalRef = useRef(requireApproval);
  requireApprovalRef.current = requireApproval;

  const isCurtainActiveRef = useRef(isCurtainActive);
  isCurtainActiveRef.current = isCurtainActive;

  // Initialize Privacy Curtain slate
  useEffect(() => {
    curtainStreamRef.current = new PrivacyCurtainStream();
    return () => {
      curtainStreamRef.current?.destroy();
      curtainStreamRef.current = null;
    };
  }, []);

  // Broadcast payload to all active DataChannels
  const broadcast = useCallback((msg: DataChannelMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }, []);

  // Determine current active video track
  const getActiveVideoTrack = useCallback((): MediaStreamTrack | null => {
    if (isCurtainActiveRef.current && curtainStreamRef.current?.track) {
      return curtainStreamRef.current.track;
    }
    return screenStreamRef.current?.getVideoTracks()[0] || null;
  }, []);

  // Build stream payload for WebRTC call
  const buildOutgoingStream = useCallback((): MediaStream => {
    const stream = new MediaStream();
    const videoTrack = getActiveVideoTrack();
    if (videoTrack) {
      stream.addTrack(videoTrack);
    }
    const audioTrack = screenStreamRef.current?.getAudioTracks()[0];
    if (audioTrack && audioTrack.enabled) {
      stream.addTrack(audioTrack);
    }
    return stream;
  }, [getActiveVideoTrack]);

  // Initiate media call to an approved viewer
  const callViewer = useCallback((viewerId: string) => {
    const peer = peerRef.current;
    if (!peer || peer.destroyed) return;

    const stream = buildOutgoingStream();
    if (stream.getTracks().length === 0) return;

    const existingCall = mediaCallsRef.current.get(viewerId);
    if (existingCall) {
      existingCall.close();
    }

    try {
      const call = peer.call(viewerId, stream);
      mediaCallsRef.current.set(viewerId, call);

      call.on('close', () => {
        mediaCallsRef.current.delete(viewerId);
      });
      call.on('error', (err) => {
        console.error(`Media call error with viewer ${viewerId}:`, err);
        mediaCallsRef.current.delete(viewerId);
      });
    } catch (err) {
      console.error(`Failed to call viewer ${viewerId}:`, err);
    }
  }, [buildOutgoingStream]);

  // Approve knocking viewer
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

    if (screenStreamRef.current) {
      callViewer(viewerId);
    }
  }, [hostName, callViewer]);

  // Decline knocking viewer
  const declineViewer = useCallback((viewerId: string, reason = 'Access declined by host.') => {
    const conn = connectionsRef.current.get(viewerId);
    if (conn && conn.open) {
      conn.send({
        type: 'ACCESS_DENIED',
        reason,
      });
      setTimeout(() => conn.close(), 300);
    }
    setParticipants((prev) => prev.filter((p) => p.id !== viewerId));
  }, []);

  // Disconnect / Kick viewer
  const kickViewer = useCallback((viewerId: string) => {
    const conn = connectionsRef.current.get(viewerId);
    if (conn && conn.open) {
      conn.send({
        type: 'KICK',
        viewerId,
      });
      setTimeout(() => conn.close(), 200);
    }
    const call = mediaCallsRef.current.get(viewerId);
    if (call) {
      call.close();
      mediaCallsRef.current.delete(viewerId);
    }
    setParticipants((prev) => prev.filter((p) => p.id !== viewerId));
  }, []);

  // Toggle Privacy Curtain with atomic track replacement
  const togglePrivacyCurtain = useCallback(() => {
    const nextState = !isCurtainActiveRef.current;
    setIsCurtainActive(nextState);
    isCurtainActiveRef.current = nextState;

    const realTrack = screenStreamRef.current?.getVideoTracks()[0];
    const curtainTrack = curtainStreamRef.current?.track;

    const targetTrack = nextState ? curtainTrack : realTrack;
    if (!targetTrack) return;

    if (realTrack) {
      // Hardware-level pixel mute when curtain is active
      realTrack.enabled = !nextState;
    }

    // Replace video track on all active peer senders
    mediaCallsRef.current.forEach((call) => {
      try {
        const pc = call.peerConnection;
        if (pc) {
          const senders = pc.getSenders();
          const videoSender = senders.find(
            (s) => (s.track && s.track.kind === 'video') || (s as { kind?: string }).kind === 'video'
          );
          if (videoSender) {
            videoSender.replaceTrack(targetTrack);
          }
        }
      } catch (err) {
        console.error('Error replacing track on sender:', err);
      }
    });

    broadcast({
      type: 'PRIVACY_CURTAIN',
      active: nextState,
    });
  }, [broadcast]);

  // Screen audio toggle
  const toggleAudio = useCallback(() => {
    if (!screenStreamRef.current) return;
    const audioTrack = screenStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioMuted(!audioTrack.enabled);

      broadcast({
        type: 'STREAM_STATUS',
        isSharing: true,
        isAudioMuted: !audioTrack.enabled,
      });
    }
  }, [broadcast]);

  // Stop screen sharing
  const stopSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsSharing(false);
    setIsCurtainActive(false);

    mediaCallsRef.current.forEach((call) => call.close());
    mediaCallsRef.current.clear();

    broadcast({
      type: 'STREAM_STATUS',
      isSharing: false,
      isAudioMuted: true,
    });
  }, [broadcast]);

  // Start screen sharing
  const startSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.contentHint = 'detail';
        videoTrack.onended = () => {
          stopSharing();
        };
      }

      screenStreamRef.current = stream;
      setIsSharing(true);
      setIsCurtainActive(false);

      const audioTrack = stream.getAudioTracks()[0];
      setIsAudioMuted(!audioTrack || !audioTrack.enabled);

      // Re-call or replace tracks for all approved participants
      participants.forEach((p) => {
        if (p.status === 'approved' || p.status === 'connected') {
          callViewer(p.id);
        }
      });

      broadcast({
        type: 'STREAM_STATUS',
        isSharing: true,
        isAudioMuted: !audioTrack || !audioTrack.enabled,
      });

      return true;
    } catch (err) {
      console.warn('Screen share request cancelled or failed:', err);
      return false;
    }
  }, [participants, callViewer, stopSharing, broadcast]);

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

  // Setup PeerJS Host
  useEffect(() => {
    const hostPeerId = getHostPeerId(roomCode);
    let peer: Peer;

    try {
      peer = new Peer(hostPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });
    } catch (err) {
      console.error('Peer initialization failure:', err);
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
        setPeerError(`Room code "${roomCode}" is currently in use.`);
      } else {
        setPeerError(err.message || 'WebRTC connection error');
      }
    });

    peer.on('connection', (conn) => {
      connectionsRef.current.set(conn.peer, conn);

      conn.on('data', (data) => {
        try {
          const payload = data as DataChannelMessage;

          if (payload.type === 'REQUEST_ACCESS') {
            const participant: ViewerParticipant = {
              id: payload.viewerId,
              displayName: payload.displayName || 'Anonymous Viewer',
              status: requireApprovalRef.current ? 'knocking' : 'approved',
              joinedAt: payload.timestamp || Date.now(),
            };

            setParticipants((prev) => {
              const filtered = prev.filter((p) => p.id !== participant.id);
              return [...filtered, participant];
            });

            if (!requireApprovalRef.current) {
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
            broadcast(payload);
          } else if (payload.type === 'LEAVE') {
            connectionsRef.current.delete(payload.viewerId);
            setParticipants((prev) => prev.filter((p) => p.id !== payload.viewerId));
            const call = mediaCallsRef.current.get(payload.viewerId);
            if (call) {
              call.close();
              mediaCallsRef.current.delete(payload.viewerId);
            }
          }
        } catch (e) {
          console.error('Error handling data channel message:', e);
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
