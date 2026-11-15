import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection, type MediaConnection } from 'peerjs';
import type { DataChannelMessage, WebRTCStats } from '../types';
import { getHostPeerId, generateViewerPeerId } from '../utils/room';
import { DEFAULT_ICE_SERVERS } from '../utils/webrtcConfig';

export type ViewerState =
  | 'connecting'
  | 'knocking'
  | 'access_granted'
  | 'connected'
  | 'access_denied'
  | 'kicked'
  | 'stream_ended'
  | 'error';

interface UseViewerSessionOptions {
  roomCode: string;
  displayName: string;
}

export function useViewerSession({ roomCode, displayName }: UseViewerSessionOptions) {
  const [viewerState, setViewerState] = useState<ViewerState>('connecting');
  const [denialReason, setDenialReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCurtainActive, setIsCurtainActive] = useState(false);
  const [isHostSharing, setIsHostSharing] = useState(false);
  const [isViewerMicMuted, setIsViewerMicMuted] = useState(true);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hostName, setHostName] = useState('Host');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; time: string; isHost?: boolean }>>([]);
  const [stats, setStats] = useState<WebRTCStats | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const activeMediaCallRef = useRef<MediaConnection | null>(null);
  const viewerMicCallRef = useRef<MediaConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const viewerPeerIdRef = useRef(generateViewerPeerId());

  const hostPeerId = getHostPeerId(roomCode);

  // Toggle Viewer Microphone
  const toggleMic = useCallback(async () => {
    if (isViewerMicMuted) {
      try {
        let stream = micStreamRef.current;
        if (!stream || stream.getTracks().length === 0 || stream.getTracks()[0].readyState === 'ended') {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          micStreamRef.current = stream;
        }

        const track = stream.getAudioTracks()[0];
        if (track) {
          track.enabled = true;
        }

        // Establish mic audio call to host if not already open
        if (peerRef.current && (!viewerMicCallRef.current || !viewerMicCallRef.current.open)) {
          const call = peerRef.current.call(hostPeerId, stream, {
            metadata: { type: 'viewer-mic', viewerId: viewerPeerIdRef.current },
          });
          viewerMicCallRef.current = call;
          call.on('close', () => {
            viewerMicCallRef.current = null;
          });
          call.on('error', (err) => {
            console.warn('Viewer mic call error:', err);
          });
        }

        setIsViewerMicMuted(false);
        if (dataConnRef.current?.open) {
          dataConnRef.current.send({
            type: 'AUDIO_STATE_CHANGE',
            participantId: viewerPeerIdRef.current,
            isMicMuted: false,
          });
        }
      } catch (err) {
        console.warn('Microphone access denied:', err);
      }
    } else {
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setIsViewerMicMuted(true);
      if (dataConnRef.current?.open) {
        dataConnRef.current.send({
          type: 'AUDIO_STATE_CHANGE',
          participantId: viewerPeerIdRef.current,
          isMicMuted: true,
        });
      }
    }
  }, [isViewerMicMuted, hostPeerId]);

  // Send a chat message
  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim() || !dataConnRef.current || !dataConnRef.current.open) return;
    const msg: DataChannelMessage = {
      type: 'CHAT_MESSAGE',
      id: Math.random().toString(36).substring(2, 9),
      senderId: viewerPeerIdRef.current,
      senderName: displayName,
      text: text.trim(),
      timestamp: Date.now(),
      isHost: false,
    };
    dataConnRef.current.send(msg);

    setChatMessages((prev) => [
      ...prev,
      {
        id: msg.id,
        sender: displayName,
        text: msg.text,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isHost: false,
      },
    ]);
  }, [displayName]);

  useEffect(() => {
    const myPeerId = viewerPeerIdRef.current;
    let peer: Peer;

    try {
      peer = new Peer(myPeerId, {
        config: {
          iceServers: DEFAULT_ICE_SERVERS,
        },
      });
    } catch (err) {
      console.error('Failed to instantiate viewer peer:', err);
      setViewerState('error');
      setErrorMessage('Failed to initialize WebRTC engine.');
      return;
    }

    peerRef.current = peer;

    let hasConnected = false;
    let connectionTimeout: number | undefined;

    peer.on('open', () => {
      // 30-second fallback timeout once connected to signaling broker and dialing host
      connectionTimeout = window.setTimeout(() => {
        if (!hasConnected) {
          setViewerState('error');
          setErrorMessage(
            `Could not connect to room "${roomCode}". Please make sure the host has started the session and is online.`
          );
        }
      }, 30000);

      const conn = peer.connect(hostPeerId, { reliable: true });
      dataConnRef.current = conn;

      conn.on('open', () => {
        hasConnected = true;
        if (connectionTimeout) window.clearTimeout(connectionTimeout);
        setViewerState('knocking');
        conn.send({
          type: 'REQUEST_ACCESS',
          viewerId: myPeerId,
          displayName: displayName.trim() || 'Anonymous Viewer',
          timestamp: Date.now(),
        });
      });

      conn.on('data', (data) => {
        try {
          const payload = data as DataChannelMessage;

          if (payload.type === 'ACCESS_GRANTED') {
            setHostName(payload.hostName || 'Host');
            setIsHostSharing(payload.streamActive);
            setViewerState('access_granted');
          } else if (payload.type === 'ACCESS_DENIED') {
            setViewerState('access_denied');
            setDenialReason(payload.reason || 'Access was declined by the host.');
          } else if (payload.type === 'PRIVACY_CURTAIN') {
            setIsCurtainActive(payload.active);
          } else if (payload.type === 'STREAM_STATUS') {
            setIsHostSharing(payload.isSharing);
          } else if (payload.type === 'FORCE_MUTE') {
            if (payload.viewerId === myPeerId) {
              if (micStreamRef.current) {
                micStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
              }
              setIsViewerMicMuted(true);
            }
          } else if (payload.type === 'KICK') {
            if (payload.viewerId === myPeerId) {
              setViewerState('kicked');
            }
          } else if (payload.type === 'CHAT_MESSAGE') {
            setChatMessages((prev) => [
              ...prev,
              {
                id: payload.id,
                sender: payload.senderName,
                text: payload.text,
                time: new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isHost: payload.isHost,
              },
            ]);
          }
        } catch (e) {
          console.error('Data channel parse error:', e);
        }
      });

      conn.on('close', () => {
        if (!hasConnected) {
          setViewerState('error');
          setErrorMessage(`Host room "${roomCode}" was not found or is currently offline.`);
          return;
        }
        setViewerState((curr) => {
          if (curr === 'kicked' || curr === 'access_denied') return curr;
          return 'stream_ended';
        });
      });

      conn.on('error', (err: any) => {
        console.error('Connection error:', err);
        setViewerState('error');
        if (!hasConnected) {
          setErrorMessage(`Host room "${roomCode}" was not found or is currently offline.`);
        } else {
          setErrorMessage(err?.message || 'Lost connection to host.');
        }
      });
    });

    // Handle incoming WebRTC Media call (Screen stream from Host)
    peer.on('call', (call) => {
      activeMediaCallRef.current = call;

      const emptyStream = new MediaStream();
      call.answer(emptyStream);

      call.on('stream', (stream) => {
        setRemoteStream(stream);
        setIsHostSharing(true);
        setViewerState('connected');
      });

      call.on('close', () => {
        setRemoteStream(null);
        activeMediaCallRef.current = null;
      });

      call.on('error', (err) => {
        console.error('Media stream error:', err);
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error in viewer:', err);
      if (err.type === 'peer-unavailable') {
        setViewerState('error');
        setErrorMessage(`Host room "${roomCode}" was not found or is currently offline.`);
      } else {
        setViewerState('error');
        setErrorMessage(err.message || 'WebRTC error');
      }
    });

    // Telemetry polling
    const statsInterval = window.setInterval(async () => {
      const call = activeMediaCallRef.current;
      if (!call || !call.peerConnection) return;

      try {
        const report = await call.peerConnection.getStats();
        let rttMs = 0;
        let fps = 0;
        let width = 0;
        let height = 0;
        let bitrateKbps = 0;
        let packetLossPercent = 0;
        let candidateType = 'direct-udp';

        report.forEach((stat) => {
          if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
            fps = stat.framesPerSecond || 0;
            width = stat.frameWidth || 0;
            height = stat.frameHeight || 0;
            const lost = stat.packetsLost || 0;
            const received = stat.packetsReceived || 0;
            if (received > 0) {
              packetLossPercent = Math.min(100, Math.round((lost / (lost + received)) * 100));
            }
            if (stat.bytesReceived) {
              bitrateKbps = Math.round((stat.bytesReceived * 8) / (1024 * 10));
            }
          }
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            rttMs = Math.round((stat.currentRoundTripTime || 0) * 1000);
          }
        });

        setStats({
          rttMs,
          fps,
          width,
          height,
          bitrateKbps,
          packetLossPercent,
          candidateType,
        });
      } catch (e) {
        console.debug('Failed to read WebRTC stats:', e);
      }
    }, 1500);

    return () => {
      if (connectionTimeout) {
        window.clearTimeout(connectionTimeout);
      }
      clearInterval(statsInterval);
      if (dataConnRef.current && dataConnRef.current.open) {
        try {
          dataConnRef.current.send({
            type: 'LEAVE',
            viewerId: myPeerId,
          });
        } catch {
          // Ignore
        }
        dataConnRef.current.close();
      }
      if (activeMediaCallRef.current) {
        activeMediaCallRef.current.close();
      }
      if (viewerMicCallRef.current) {
        viewerMicCallRef.current.close();
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peer.destroy();
    };
  }, [roomCode, hostPeerId, displayName]);

  return {
    viewerState,
    denialReason,
    errorMessage,
    isCurtainActive,
    isHostSharing,
    isViewerMicMuted,
    remoteStream,
    hostName,
    chatMessages,
    stats,
    toggleMic,
    sendChatMessage,
  };
}
