import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  PictureInPicture2,
  Clock,
  AlertCircle,
  Activity,
  MessageSquare,
  EyeOff,
  LogOut,
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
    isViewerMicMuted,
    remoteStream,
    hostName,
    chatMessages,
    stats,
    toggleMic,
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
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

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
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-3">
          <Clock className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Waiting in Host Lobby</h2>
        <p className="text-xs text-zinc-400 mb-6">
          Request sent to room <strong className="text-zinc-200 font-mono">{roomCode}</strong>. Video streaming will begin as soon as the host approves your request.
        </p>

        <button
          onClick={onExit}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition"
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
        <p className="text-xs text-zinc-400 mb-6">
          {denialReason || 'The host declined your request to join this session.'}
        </p>
        <button
          onClick={onExit}
          className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-semibold transition"
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
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">
          {viewerState === 'kicked' ? 'Session Disconnected' : 'Stream Ended'}
        </h2>
        <p className="text-xs text-zinc-400 mb-6">
          {viewerState === 'kicked'
            ? 'The host disconnected your viewer session.'
            : 'The host has stopped screen sharing.'}
        </p>
        <button
          onClick={onExit}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition"
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
        <p className="text-xs text-zinc-400 mb-6">
          {errorMessage || 'Unable to connect to host. Please verify room code and network connectivity.'}
        </p>
        <button
          onClick={onExit}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Try Another Room
        </button>
      </div>
    );
  }

  // Shared Control Bar UI (rendered below video in normal view, and as an overlay in fullscreen)
  const renderControls = (isOverlay = false) => (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${
        isOverlay
          ? 'bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 px-4 py-2.5 rounded-2xl shadow-2xl max-w-2xl mx-auto'
          : 'w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-sm'
      }`}
    >
      {/* Left: Viewer Mic & Volume Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Viewer Microphone Toggle Button */}
        <button
          onClick={toggleMic}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition ${
            isViewerMicMuted
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
              : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/50'
          }`}
          title={isViewerMicMuted ? 'Unmute Your Microphone' : 'Mute Your Microphone'}
        >
          {isViewerMicMuted ? (
            <>
              <MicOff className="w-3.5 h-3.5 text-zinc-400" />
              <span>Mic Muted</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mic Active</span>
            </>
          )}
        </button>

        {/* Clear, Accessible Volume Slider */}
        <div className="flex items-center space-x-2 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => handleVolumeChange(isMuted ? (volume > 0 ? volume : 1) : 0)}
            className="text-zinc-400 hover:text-white transition p-0.5 rounded hover:bg-zinc-800"
            title={isMuted || volume === 0 ? 'Unmute Volume' : 'Mute Volume'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 sm:w-28 h-1.5 accent-zinc-200 bg-zinc-800 rounded cursor-pointer"
          />
          <span className="text-[11px] font-mono text-zinc-400 w-8 text-right select-none">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      </div>

      {/* Center: Chat, PiP, Fullscreen, WebRTC Stats */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition ${
            isChatOpen
              ? 'bg-zinc-700 text-white border-zinc-500'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
          {chatMessages.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-zinc-700 text-white rounded-full">
              {chatMessages.length}
            </span>
          )}
        </button>

        <button
          onClick={togglePiP}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center space-x-1 transition"
          title="Picture in Picture"
        >
          <PictureInPicture2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PiP</span>
        </button>

        <button
          onClick={toggleFullscreen}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center space-x-1 transition"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full'}</span>
        </button>

        <button
          onClick={() => setIsStatsOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-mono flex items-center space-x-1 transition"
          title="WebRTC Telemetry"
        >
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>{stats?.rttMs ? `${stats.rttMs}ms` : 'P2P'}</span>
        </button>
      </div>

      {/* Right: Leave Button */}
      <button
        onClick={onExit}
        className="px-3.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-300 hover:text-red-200 border border-red-800/50 text-xs font-medium flex items-center space-x-1.5 transition"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Leave</span>
      </button>
    </div>
  );

  // State 5: Active Stream Player
  return (
    <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col space-y-3">
      {audioAutoplayBlocked && (
        <div className="p-2.5 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center space-x-2">
            <VolumeX className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>Browser policy prevented autoplaying audio.</span>
          </div>
          <button
            onClick={handleUnmuteClick}
            className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded text-xs transition"
          >
            Unmute Audio
          </button>
        </div>
      )}

      {/* Video Viewport */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center group shadow-lg"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />

        {/* Top Overlay Bar */}
        <div className="absolute top-3 left-3 flex items-center space-x-2 z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-zinc-900/85 backdrop-blur-sm border border-zinc-800 text-[11px] font-medium text-zinc-200 shadow-sm">
            {hostName}’s Screen
          </span>
          {isCurtainActive && (
            <span className="px-2 py-0.5 rounded bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 text-[11px] font-medium text-zinc-300 flex items-center space-x-1.5 shadow-sm">
              <EyeOff className="w-3 h-3 text-zinc-400" />
              <span>Screen Paused by Host</span>
            </span>
          )}
        </div>

        {/* Fullscreen Floating Controls (Only shown inside video viewport when in Fullscreen) */}
        {isFullscreen && (
          <div className="absolute bottom-5 left-4 right-4 z-20 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {renderControls(true)}
          </div>
        )}
      </div>

      {/* Normal Windowed Mode Control Console */}
      {!isFullscreen && renderControls(false)}

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
