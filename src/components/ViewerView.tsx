import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  PictureInPicture2,
  Clock,
  Shield,
  AlertCircle,
  Activity,
  MessageSquare,
} from 'lucide-react';
import { useViewerSession } from '../hooks/useViewerSession';
import { ChatDrawer } from './ChatDrawer';
import { StatsModal } from './StatsModal';

interface ViewerViewProps {
  roomCode: string;
  displayName: string;
  onExit: () => void;
}

export const ViewerView: React.FC<ViewerViewProps> = ({
  roomCode,
  displayName,
  onExit,
}) => {
  const {
    viewerState,
    denialReason,
    errorMessage,
    isCurtainActive,
    remoteStream,
    hostName,
    chatMessages,
    stats,
    sendChatMessage,
  } = useViewerSession({ roomCode, displayName });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (remoteStream) {
      video.srcObject = remoteStream;
      video
        .play()
        .then(() => setAudioAutoplayBlocked(false))
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(console.error);
          setAudioAutoplayBlocked(true);
        });
    } else {
      video.srcObject = null;
    }
  }, [remoteStream]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error('PiP failure:', e);
    }
  };

  const handleUnmuteClick = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      setIsMuted(false);
      video.volume = 1;
      setAudioAutoplayBlocked(false);
      video.play().catch(console.error);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    const video = videoRef.current;
    if (video) {
      video.volume = newVol;
      video.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  // State 1: Knocking in Waiting Lobby
  if (viewerState === 'knocking') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
          <Clock className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Waiting in Host Lobby</h2>
        <p className="text-xs text-slate-400 mb-6">
          Request sent to room <strong className="text-slate-200 font-mono">{roomCode}</strong>. Video streaming will begin as soon as the host approves your request.
        </p>

        <button
          onClick={onExit}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  // State 2: Access Denied
  if (viewerState === 'access_denied') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Access Declined</h2>
        <p className="text-xs text-slate-400 mb-6">
          {denialReason || 'The host declined your request to join this session.'}
        </p>
        <button
          onClick={onExit}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
        >
          Return Home
        </button>
      </div>
    );
  }

  // State 3: Disconnected / Ended / Kicked
  if (viewerState === 'stream_ended' || viewerState === 'kicked') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">
          {viewerState === 'kicked' ? 'Session Disconnected' : 'Stream Ended'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {viewerState === 'kicked'
            ? 'The host disconnected your viewer session.'
            : 'The host has stopped screen sharing.'}
        </p>
        <button
          onClick={onExit}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Return Home
        </button>
      </div>
    );
  }

  // State 4: Connection Error
  if (viewerState === 'error') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Connection Error</h2>
        <p className="text-xs text-slate-400 mb-6">
          {errorMessage || 'Unable to connect to host. Please verify room code and network connectivity.'}
        </p>
        <button
          onClick={onExit}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Try Another Room
        </button>
      </div>
    );
  }

  // State 5: Active Stream Player
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col space-y-4">
      {audioAutoplayBlocked && (
        <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-lg flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Browser policy prevented autoplaying audio.</span>
          </div>
          <button
            onClick={handleUnmuteClick}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-xs transition"
          >
            Unmute Audio
          </button>
        </div>
      )}

      {/* Video Viewport */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center group"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />

        {/* Top Overlay Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-200">
              {hostName}’s Screen
            </span>
            {isCurtainActive && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[11px] font-semibold text-amber-300 flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Privacy Curtain Active</span>
              </span>
            )}
          </div>

          <button
            onClick={() => setIsStatsOpen(true)}
            className="pointer-events-auto px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white transition flex items-center space-x-1"
          >
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>{stats?.rttMs ? `${stats.rttMs}ms` : 'Direct UDP'}</span>
          </button>
        </div>

        {/* Bottom Media Controls Bar */}
        <div className="absolute bottom-3 right-3 flex items-center space-x-2 z-10 pointer-events-auto opacity-80 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => handleVolumeChange(isMuted ? 1 : 0)}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-slate-200" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-14 h-1 accent-indigo-500 bg-slate-800 rounded cursor-pointer"
            />
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-1 rounded transition ${
                isChatOpen
                  ? 'bg-indigo-600/30 text-indigo-300'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={togglePiP}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Picture in Picture"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Direct WebRTC P2P stream</span>
        <button
          onClick={onExit}
          className="hover:text-red-400 transition"
        >
          Leave Session
        </button>
      </div>

      <StatsModal
        stats={stats}
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
      />

      <ChatDrawer
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
};
