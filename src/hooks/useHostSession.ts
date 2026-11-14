import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection, type MediaConnection } from 'peerjs';
import type { ViewerParticipant, DataChannelMessage } from '../types';
import { getHostPeerId } from '../utils/room';
import { PrivacyCurtainStream } from '../utils/curtainCanvas';
import { HostAudioMixer } from '../utils/audioMixer';

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
  const [isScreenAudioMuted, setIsScreenAudioMuted] = useState(false);
  const [isHostMicMuted, setIsHostMicMuted] = useState(true);
  const [participants, setParticipants] = useState<ViewerParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; time: string; isHost?: boolean }>>([]);

  const peerRef = useRef<Peer | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const hostMicStreamRef = useRef<MediaStream | null>(null);
  const curtainStreamRef = useRef<PrivacyCurtainStream | null>(null);
  const audioMixerRef = useRef<HostAudioMixer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const mediaCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const viewerAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const requireApprovalRef = useRef(requireApproval);
  requireApprovalRef.current = requireApproval;

  const isCurtainActiveRef = useRef(isCurtainActive);
  isCurtainActiveRef.current = isCurtainActive;

  // Initialize Privacy Curtain and Audio Mixer
  useEffect(() => {
    curtainStreamRef.current = new PrivacyCurtainStream();
    audioMixerRef.current = new HostAudioMixer();

    return () => {
      curtainStreamRef.current?.destroy();
      curtainStreamRef.current = null;
      audioMixerRef.current?.destroy();
      audioMixerRef.current = null;
      if (hostMicStreamRef.current) {
        hostMicStreamRef.current.getTracks().forEach((t) => t.stop());
        hostMicStreamRef.current = null;
      }
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

  // Update audio track on all outgoing WebRTC calls
  const updateAudioTrackOnAllCalls = useCallback(() => {
    const mixedAudio = audioMixerRef.current?.getMixedTrack();
    if (!mixedAudio) return;

    mediaCallsRef.current.forEach((call) => {
      try {
        const pc = call.peerConnection;
        if (pc) {
          const senders = pc.getSenders();
          const audioSender = senders.find(
            (s) => (s.track && s.track.kind === 'audio') || (s as { kind?: string }).kind === 'audio'
          );
          if (audioSender) {
            audioSender.replaceTrack(mixedAudio);
          }
        }
      } catch (err) {
        console.warn('Error updating audio sender:', err);
      }
    });
  }, []);

  // Build combined outgoing stream for WebRTC
  const buildOutgoingStream = useCallback((): MediaStream => {
    const stream = new MediaStream();
    const videoTrack = getActiveVideoTrack();
    if (videoTrack) {
      stream.addTrack(videoTrack);
    }
    const mixedAudioTrack = audioMixerRef.current?.getMixedTrack();
    if (mixedAudioTrack) {
      stream.addTrack(mixedAudioTrack);
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

  // Force mute a viewer
  const forceMuteViewer = useCallback((viewerId: string) => {
    const conn = connectionsRef.current.get(viewerId);
    if (conn && conn.open) {
      conn.send({
        type: 'FORCE_MUTE',
        viewerId,
      });
    }
    setParticipants((prev) =>
      prev.map((p) => (p.id === viewerId ? { ...p, isMicMuted: true } : p))
    );
  }, []);

  // Toggle Host Microphone
  const toggleHostMic = useCallback(async () => {
    if (isHostMicMuted) {
      try {
        let stream = hostMicStreamRef.current;
        if (!stream || stream.getTracks().length === 0 || stream.getTracks()[0].readyState === 'ended') {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          hostMicStreamRef.current = stream;
        }

        const track = stream.getAudioTracks()[0];
        if (track) {
          track.enabled = true;
          audioMixerRef.current?.addSource('host-mic', stream);
          updateAudioTrackOnAllCalls();
        }

        setIsHostMicMuted(false);
        broadcast({
          type: 'AUDIO_STATE_CHANGE',
          participantId: 'host',
          isMicMuted: false,
        });
      } catch (err) {
        console.warn('Microphone permission denied or not available:', err);
      }
    } else {
      if (hostMicStreamRef.current) {
        hostMicStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        audioMixerRef.current?.removeSource('host-mic');
        updateAudioTrackOnAllCalls();
      }
      setIsHostMicMuted(true);
      broadcast({
        type: 'AUDIO_STATE_CHANGE',
        participantId: 'host',
        isMicMuted: true,
      });
    }
  }, [isHostMicMuted, broadcast, updateAudioTrackOnAllCalls]);

  // Toggle Screen System Audio
  const toggleScreenAudio = useCallback(() => {
    if (!screenStreamRef.current) return;
    const audioTrack = screenStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextState = !audioTrack.enabled;
      audioTrack.enabled = nextState;
      setIsScreenAudioMuted(!nextState);

      if (nextState) {
        audioMixerRef.current?.addSource('screen-audio', new MediaStream([audioTrack]));
      } else {
        audioMixerRef.current?.removeSource('screen-audio');
      }
      updateAudioTrackOnAllCalls();

      broadcast({
        type: 'STREAM_STATUS',
        isSharing: true,
        isAudioMuted: !nextState,
      });
    }
  }, [broadcast, updateAudioTrackOnAllCalls]);

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
      realTrack.enabled = !nextState;
    }

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

  // Stop screen sharing
  const stopSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    audioMixerRef.current?.removeSource('screen-audio');
    updateAudioTrackOnAllCalls();

    setIsSharing(false);
    setIsCurtainActive(false);

    mediaCallsRef.current.forEach((call) => call.close());
    mediaCallsRef.current.clear();

    broadcast({
      type: 'STREAM_STATUS',
      isSharing: false,
      isAudioMuted: true,
    });
  }, [broadcast, updateAudioTrackOnAllCalls]);

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
      if (audioTrack && audioTrack.enabled) {
        setIsScreenAudioMuted(false);
        audioMixerRef.current?.addSource('screen-audio', new MediaStream([audioTrack]));
      } else {
        setIsScreenAudioMuted(true);
      }

      updateAudioTrackOnAllCalls();

      // Call or reconnect all approved participants
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
  }, [participants, callViewer, stopSharing, broadcast, updateAudioTrackOnAllCalls]);

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

    // Handle incoming calls (Viewers sending microphone audio stream)
    peer.on('call', (incomingCall) => {
      // Answer incoming call to receive viewer mic audio
      incomingCall.answer();

      incomingCall.on('stream', (viewerMicStream) => {
        // Play viewer's voice on host speakers
        const audio = new Audio();
        audio.srcObject = viewerMicStream;
        audio.play().catch(() => {});
        viewerAudioElementsRef.current.set(incomingCall.peer, audio);

        // Mix viewer mic so other viewers hear them
        audioMixerRef.current?.addSource(incomingCall.peer, viewerMicStream);
        updateAudioTrackOnAllCalls();
      });

      incomingCall.on('close', () => {
        const audio = viewerAudioElementsRef.current.get(incomingCall.peer);
        if (audio) {
          audio.srcObject = null;
          viewerAudioElementsRef.current.delete(incomingCall.peer);
        }
        audioMixerRef.current?.removeSource(incomingCall.peer);
        updateAudioTrackOnAllCalls();
      });

      incomingCall.on('error', (err) => {
        console.warn(`Incoming call error from ${incomingCall.peer}:`, err);
      });
    });

    // Handle incoming DataChannels
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
              isMicMuted: true,
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
          } else if (payload.type === 'AUDIO_STATE_CHANGE') {
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === payload.participantId ? { ...p, isMicMuted: payload.isMicMuted } : p
              )
            );
            broadcast(payload);
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
            audioMixerRef.current?.removeSource(payload.viewerId);
            updateAudioTrackOnAllCalls();
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
        audioMixerRef.current?.removeSource(conn.peer);
        updateAudioTrackOnAllCalls();
      });
    });

    return () => {
      stopSharing();
      connectionsRef.current.forEach((conn) => conn.close());
      connectionsRef.current.clear();
      mediaCallsRef.current.forEach((call) => call.close());
      mediaCallsRef.current.clear();
      viewerAudioElementsRef.current.forEach((audio) => {
        audio.srcObject = null;
      });
      viewerAudioElementsRef.current.clear();
      peer.destroy();
    };
  }, [roomCode, hostName, broadcast, callViewer, stopSharing, updateAudioTrackOnAllCalls]);

  return {
    peerReady,
    peerError,
    isSharing,
    isCurtainActive,
    isScreenAudioMuted,
    isHostMicMuted,
    participants,
    chatMessages,
    screenStream: screenStreamRef.current,
    startSharing,
    stopSharing,
    togglePrivacyCurtain,
    toggleScreenAudio,
    toggleHostMic,
    approveViewer,
    declineViewer,
    kickViewer,
    forceMuteViewer,
    sendChatMessage,
  };
}
