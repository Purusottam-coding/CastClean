import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection, type MediaConnection } from 'peerjs';
import type { DataChannelMessage, WebRTCStats } from '../types';
import { getHostPeerId, generateViewerPeerId } from '../utils/room';

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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hostName, setHostName] = useState('Host');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; time: string; isHost?: boolean }>>([]);
  const [stats, setStats] = useState<WebRTCStats | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const activeMediaCallRef = useRef<MediaConnection | null>(null);
  const viewerPeerIdRef = useRef(generateViewerPeerId());

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
    const hostPeerId = getHostPeerId(roomCode);
    const myPeerId = viewerPeerIdRef.current;
    let peer: Peer;

    try {
      peer = new Peer(myPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });
    } catch (err) {
      console.error('Failed to instantiate viewer peer:', err);
      setViewerState('error');
      setErrorMessage('Failed to initialize WebRTC engine.');
      return;
    }

    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(hostPeerId, { reliable: true });
      dataConnRef.current = conn;

      conn.on('open', () => {
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
        setViewerState((curr) => {
          if (curr === 'kicked' || curr === 'access_denied') return curr;
          return 'stream_ended';
        });
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
        setViewerState('error');
        setErrorMessage('Lost connection to host.');
      });
    });

    // Handle incoming WebRTC Media call
    peer.on('call', (call) => {
      activeMediaCallRef.current = call;

      // Answer with dummy stream (one-way screen viewing)
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
      peer.destroy();
    };
  }, [roomCode, displayName]);

  return {
    viewerState,
    denialReason,
    errorMessage,
    isCurtainActive,
    isHostSharing,
    remoteStream,
    hostName,
    chatMessages,
    stats,
    sendChatMessage,
  };
}
