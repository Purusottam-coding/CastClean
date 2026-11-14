import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection, type MediaConnection } from 'peerjs';
import type { DataChannelMessage, PeerStats } from '../types';
import { getHostPeerId, generateViewerPeerId } from '../utils/room';
import { playApprovedChime } from '../utils/audioChime';

export type ViewerState =
  | 'connecting'
  | 'knocking'
  | 'access_granted'
  | 'access_denied'
  | 'connected'
  | 'stream_ended'
  | 'kicked'
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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hostName, setHostName] = useState<string>('Host');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; time: string; isHost?: boolean }>>([]);
  const [activeReactions, setActiveReactions] = useState<Array<{ id: string; emoji: string; senderName: string }>>([]);
  const [stats, setStats] = useState<PeerStats | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const activeMediaCallRef = useRef<MediaConnection | null>(null);
  const viewerPeerIdRef = useRef<string>(generateViewerPeerId());
  const statsTimerRef = useRef<number | null>(null);

  // Send a reaction to host & peers
  const sendReaction = useCallback((emoji: string) => {
    if (!dataConnRef.current || !dataConnRef.current.open) return;
    const msg: DataChannelMessage = {
      type: 'REACTION',
      id: Math.random().toString(36).substring(2, 9),
      senderName: displayName,
      emoji,
      timestamp: Date.now(),
    };
    dataConnRef.current.send(msg);

    // Show locally
    setActiveReactions((prev) => [...prev, { id: msg.id, emoji, senderName: displayName }]);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== msg.id));
    }, 3000);
  }, [displayName]);

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

    // Show locally
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

  // Initialize Viewer connection
  useEffect(() => {
    let peer: Peer;
    const hostPeerId = getHostPeerId(roomCode);
    const myPeerId = viewerPeerIdRef.current;

    try {
      peer = new Peer(myPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });
    } catch (err) {
      console.error('Failed to create Peer instance:', err);
      setViewerState('error');
      setErrorMessage('Failed to initialize WebRTC engine');
      return;
    }

    peerRef.current = peer;

    peer.on('open', () => {
      // Connect to Host DataChannel
      const conn = peer.connect(hostPeerId, {
        reliable: true,
      });

      dataConnRef.current = conn;

      conn.on('open', () => {
        // Send REQUEST_ACCESS knock
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
            setViewerState('access_granted');
            playApprovedChime();
          } else if (payload.type === 'ACCESS_DENIED') {
            setViewerState('access_denied');
            setDenialReason(payload.reason || 'Access request was declined by the host.');
          } else if (payload.type === 'PRIVACY_CURTAIN_STATE') {
            setIsCurtainActive(payload.active);
          } else if (payload.type === 'STREAM_ENDED') {
            setViewerState('stream_ended');
          } else if (payload.type === 'KICK_VIEWER') {
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
          } else if (payload.type === 'REACTION') {
            setActiveReactions((prev) => [
              ...prev,
              { id: payload.id, emoji: payload.emoji, senderName: payload.senderName },
            ]);
            setTimeout(() => {
              setActiveReactions((prev) => prev.filter((r) => r.id !== payload.id));
            }, 3000);
          }
        } catch (e) {
          console.error('Error handling data channel payload:', e);
        }
      });

      conn.on('close', () => {
        if (viewerState !== 'stream_ended' && viewerState !== 'kicked' && viewerState !== 'access_denied') {
          setViewerState('stream_ended');
        }
      });

      conn.on('error', (err) => {
        console.error('Data connection error:', err);
        setViewerState('error');
        setErrorMessage('Lost connection to host.');
      });
    });

    // Listen for incoming MediaConnection from Host
    peer.on('call', (call) => {
      activeMediaCallRef.current = call;

      // Answer with dummy/empty stream since viewer is viewing
      const emptyStream = new MediaStream();
      call.answer(emptyStream);

      call.on('stream', (stream) => {
        setRemoteStream(stream);
        setViewerState('connected');
      });

      call.on('close', () => {
        setRemoteStream(null);
      });

      call.on('error', (err) => {
        console.error('Media call error:', err);
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error in viewer:', err);
      if (err.type === 'peer-unavailable') {
        setViewerState('error');
        setErrorMessage(`Host room "${roomCode}" was not found or is currently offline.`);
      } else {
        setViewerState('error');
        setErrorMessage(`WebRTC error: ${err.message || err.type}`);
      }
    });

    // Periodic WebRTC Stats collector
    const interval = window.setInterval(async () => {
      const call = activeMediaCallRef.current;
      if (!call || !call.peerConnection) return;

      try {
        const statsReport = await call.peerConnection.getStats();
        let rttMs = 0;
        let fps = 0;
        let width = 0;
        let height = 0;
        let bitrateKbps = 0;
        let packetLossPercent = 0;
        let connectionType = 'direct-udp';

        statsReport.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            fps = report.framesPerSecond || 0;
            width = report.frameWidth || 0;
            height = report.frameHeight || 0;

            const packetsLost = report.packetsLost || 0;
            const packetsReceived = report.packetsReceived || 0;
            if (packetsReceived > 0) {
              packetLossPercent = Math.min(100, Math.round((packetsLost / (packetsLost + packetsReceived)) * 100));
            }

            // Approximate bitrate
            if (report.bytesReceived) {
              bitrateKbps = Math.round((report.bytesReceived * 8) / (1024 * 10)); // rough estimate
            }
          }

          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rttMs = Math.round((report.currentRoundTripTime || 0) * 1000);
          }
        });

        setStats({
          rttMs,
          fps,
          width,
          height,
          bitrateKbps,
          packetLossPercent,
          connectionType,
        });
      } catch (e) {
        console.debug('Failed to get stats', e);
      }
    }, 1500);

    statsTimerRef.current = interval;

    return () => {
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
      if (dataConnRef.current) dataConnRef.current.close();
      if (activeMediaCallRef.current) activeMediaCallRef.current.close();
      peer.destroy();
    };
  }, [roomCode, displayName]);

  return {
    viewerState,
    denialReason,
    errorMessage,
    isCurtainActive,
    remoteStream,
    hostName,
    chatMessages,
    activeReactions,
    stats,
    sendReaction,
    sendChatMessage,
  };
}
