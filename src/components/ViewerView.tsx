import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Radio,
  Clock,
  Tv,
  AlertCircle,
  ShieldAlert,
  PictureInPicture2,
  Sparkles,
} from 'lucide-react';
import { useViewerSession } from '../hooks/useViewerSession';
import { ReactionsOverlay } from './ReactionsOverlay';
import { ChatDrawer } from './ChatDrawer';
import { StatsModal } from './StatsModal';

interface ViewerViewProps {
  roomCode: string;
  displayName: string;
  onExit: () => void;
}

const EMOJI_REACTIONS = ['👍', '🔥', '👏', '💡', '❓', '❤️'];

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
    activeReactions,
    stats,
    sendReaction,
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

  // Bind remote stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (remoteStream) {
      video.srcObject = remoteStream;
      video
        .play()
        .then(() => {
          setAudioAutoplayBlocked(false);
        })
        .catch((err) => {
          console.warn('Autoplay failed (possibly audio policy):', err);
          // Try playing muted to at least show video
          video.muted = true;
          setIsMuted(true);
          video.play().catch((e) => console.error('Even muted play failed:', e));
          setAudioAutoplayBlocked(true);
        });
    } else {
      video.srcObject = null;
    }
  }, [remoteStream]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  // Handle Picture-in-Picture
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
      console.error('PiP failed', e);
    }
  };

  // Handle Unmute from browser block
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

  // State: Knocking in Lobby
  if (viewerState === 'knocking') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center animate-in fade-in duration-300">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Radio className="w-10 h-10 animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-3">
          Waiting Lobby Gatekeeper
        </span>

        <h2 className="text-2xl font-bold text-white mb-2">
          Waiting for Host Approval
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          You have knocked on room <strong className="text-slate-200 font-mono">{roomCode}</strong> as{' '}
          <strong className="text-indigo-300">{displayName}</strong>. The host has been notified to allow your access.
        </p>

        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 space-y-2 text-xs text-left">
          <div className="flex items-center justify-between text-slate-400">
            <span>Status:</span>
            <span className="text-amber-400 font-semibold flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Host Approval Required</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Signaling:</span>
            <span className="text-emerald-400 font-medium">DataChannel Connected</span>
          </div>
        </div>

        <button
          onClick={onExit}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
        >
          Cancel & Leave Lobby
        </button>
      </div>
    );
  }

  // State: Access Denied
  if (viewerState === 'access_denied') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Request Declined</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          {denialReason || 'The host declined your request to view this screen session.'}
        </p>
        <button
          onClick={onExit}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // State: Kicked
  if (viewerState === 'kicked') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Disconnected by Host</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          The host has disconnected your viewing session.
        </p>
        <button
          onClick={onExit}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // State: Stream Ended
  if (viewerState === 'stream_ended') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
          <Tv className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Screen Share Ended</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          The host has stopped streaming or closed the session.
        </p>
        <button
          onClick={onExit}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // State: Error
  if (viewerState === 'error') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          {errorMessage || 'Unable to connect to host. Please verify the room code and try again.'}
        </p>
        <button
          onClick={onExit}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Try Another Room
        </button>
      </div>
    );
  }

  // State: Connected / Watching Stream
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col space-y-4 relative">
      <ReactionsOverlay reactions={activeReactions} />

      {/* Autoplay Audio Block Banner */}
      {audioAutoplayBlocked && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-between text-amber-200 text-xs">
          <div className="flex items-center space-x-2">
            <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Audio was muted by browser autoplay policy.</span>
          </div>
          <button
            onClick={handleUnmuteClick}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
          >
            Click to Unmute Audio
          </button>
        </div>
      )}

      {/* Player Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center group"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />

        {/* Top Floating Badge Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none transition-opacity duration-300 opacity-90 group-hover:opacity-100">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs font-semibold text-slate-200 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{hostName}’s Screen</span>
            </span>

            {isCurtainActive && (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center space-x-1.5 shadow">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Privacy Curtain Active</span>
              </span>
            )}
          </div>

          <div className="pointer-events-auto flex items-center space-x-2">
            <button
              onClick={() => setIsStatsOpen(true)}
              className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-mono font-medium text-slate-300 hover:text-white transition flex items-center space-x-1"
            >
              <span className="text-emerald-400">{stats?.rttMs ? `${stats.rttMs}ms` : 'P2P'}</span>
              <span>•</span>
              <span>{stats?.fps ? `${stats.fps}fps` : '60fps'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none transition-opacity duration-300 opacity-90 group-hover:opacity-100">
          {/* Reaction Bar */}
          <div className="pointer-events-auto flex items-center space-x-1 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 p-1 rounded-2xl shadow-lg">
            <span className="px-2 text-[10px] font-semibold text-slate-400 hidden sm:inline flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>React</span>
            </span>
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-lg hover:scale-125 transition-transform"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Media Controls */}
          <div className="pointer-events-auto flex items-center space-x-2 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-2xl shadow-lg">
            {/* Volume */}
            <div className="flex items-center space-x-1 px-1">
              <button
                onClick={() => handleVolumeChange(isMuted ? 1 : 0)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1.5 accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer hidden sm:block"
              />
            </div>

            {/* PiP */}
            <button
              onClick={togglePiP}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Picture-in-Picture"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Leave button under player */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Zero-Delay P2P Active</span>
        </div>
        <button
          onClick={onExit}
          className="text-xs text-slate-400 hover:text-red-400 transition"
        >
          Leave Stream
        </button>
      </div>

      {/* Modals & Chat */}
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
