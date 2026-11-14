import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  Cast,
  Users,
  Mic,
  MicOff,
  Share2,
  PhoneOff,
  UserCheck,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import { useHostSession } from '../hooks/useHostSession';
import { ReactionsOverlay } from './ReactionsOverlay';
import { ChatDrawer } from './ChatDrawer';
import { ShareModal } from './ShareModal';

interface HostViewProps {
  roomCode: string;
  hostName: string;
  requireApproval: boolean;
  onExit: () => void;
}

export const HostView: React.FC<HostViewProps> = ({
  roomCode,
  hostName,
  requireApproval,
  onExit,
}) => {
  const {
    peerReady,
    peerError,
    isSharing,
    isCurtainActive,
    isAudioMuted,
    participants,
    chatMessages,
    activeReactions,
    screenStream,
    startSharing,
    stopSharing,
    togglePrivacyCurtain,
    toggleAudio,
    approveViewer,
    declineViewer,
    kickViewer,
    sendChatMessage,
  } = useHostSession({ roomCode, hostName, requireApproval });

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAudienceList, setShowAudienceList] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Bind screen stream to local preview video element
  useEffect(() => {
    if (videoPreviewRef.current) {
      if (screenStream) {
        videoPreviewRef.current.srcObject = screenStream;
      } else {
        videoPreviewRef.current.srcObject = null;
      }
    }
  }, [screenStream]);

  // Keyboard shortcut: Press 'P' to toggle Privacy Curtain
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (isSharing) {
          togglePrivacyCurtain();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSharing, togglePrivacyCurtain]);

  const knockingParticipants = participants.filter((p) => p.status === 'knocking');
  const approvedParticipants = participants.filter(
    (p) => p.status === 'approved' || p.status === 'connected'
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col space-y-6 relative">
      <ReactionsOverlay reactions={activeReactions} />

      {/* Peer error alert if any */}
      {peerError && (
        <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-2xl flex items-center justify-between text-red-200 text-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{peerError}</span>
          </div>
          <button
            onClick={onExit}
            className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded-lg text-white font-medium"
          >
            Leave & Try Again
          </button>
        </div>
      )}

      {/* Knocking Viewers Notification Banner */}
      {knockingParticipants.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-amber-950/90 border border-amber-500/40 rounded-2xl p-4 shadow-xl shadow-amber-500/10 animate-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                <Users className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">
                  {knockingParticipants.length} viewer{knockingParticipants.length > 1 ? 's' : ''} knocking for access
                </h4>
                <p className="text-xs text-amber-200/80">
                  {knockingParticipants.map((p) => p.displayName).join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              {knockingParticipants.map((p) => (
                <div key={p.id} className="flex items-center space-x-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-amber-500/30">
                  <span className="text-xs font-semibold text-slate-200">{p.displayName}</span>
                  <button
                    onClick={() => approveViewer(p.id)}
                    className="p-1 rounded bg-emerald-600/80 hover:bg-emerald-500 text-white transition"
                    title="Allow Viewer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => declineViewer(p.id)}
                    className="p-1 rounded bg-red-600/80 hover:bg-red-500 text-white transition"
                    title="Decline Viewer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Video Preview Area */}
      <div className="relative w-full aspect-video bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center group">
        {isSharing ? (
          <>
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />

            {/* Privacy Curtain Overlay Indicator on Preview */}
            {isCurtainActive && (
              <div className="absolute inset-0 bg-indigo-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
                  <ShieldAlert className="w-8 h-8 animate-pulse text-amber-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  PRIVACY CURTAIN ENGAGED
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm max-w-md mt-1">
                  Viewers currently see your animated privacy curtain canvas instead of your screen. Your screen is completely hidden.
                </p>
                <button
                  onClick={togglePrivacyCurtain}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/30 flex items-center space-x-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Resume Screen Stream (Press P)</span>
                </button>
              </div>
            )}

            {/* Top Bar inside preview */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs font-semibold text-slate-200 shadow">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE SCREENCAST</span>
                </span>
                {isCurtainActive && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-[11px] font-bold text-amber-300 shadow">
                    CURTAIN ON
                  </span>
                )}
              </div>

              <div className="pointer-events-auto flex items-center space-x-2">
                <button
                  onClick={() => setShowAudienceList(!showAudienceList)}
                  className="px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-slate-200 hover:text-white hover:border-slate-600 transition flex items-center space-x-1.5 shadow"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{approvedParticipants.length} Watching</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty / Initial State */
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 shadow-inner">
              <Cast className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Screen Share Ready</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Select an entire screen, application window, or browser tab to stream at zero delay directly to your viewers.
            </p>
            <button
              onClick={startSharing}
              disabled={!peerReady}
              className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/30 transform hover:-translate-y-0.5"
            >
              <Cast className="w-4 h-4" />
              <span>{peerReady ? 'Select Screen & Share' : 'Connecting Broker...'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* Left: Privacy Curtain Toggle (The flagship feature) */}
        <div className="flex items-center space-x-2">
          {isSharing ? (
            <button
              onClick={togglePrivacyCurtain}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md ${
                isCurtainActive
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
              title="Shortcut: Press 'P' key"
            >
              {isCurtainActive ? (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Resume Screen</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Privacy Curtain (P)</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={startSharing}
              disabled={!peerReady}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 shadow-md"
            >
              <Cast className="w-4 h-4" />
              <span>Start Sharing</span>
            </button>
          )}

          {isSharing && (
            <button
              onClick={toggleAudio}
              className={`p-2.5 rounded-xl text-xs font-semibold border transition ${
                isAudioMuted
                  ? 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
              }`}
              title={isAudioMuted ? 'Unmute Screen Audio' : 'Mute Screen Audio'}
            >
              {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Center: Share & Info */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Invite Viewers</span>
          </button>

          <button
            onClick={() => setShowAudienceList(!showAudienceList)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audience ({approvedParticipants.length})</span>
          </button>
        </div>

        {/* Right: Stop & Leave */}
        <div className="flex items-center space-x-2">
          {isSharing && (
            <button
              onClick={stopSharing}
              className="px-3.5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold border border-red-500/30 transition flex items-center space-x-1.5"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Stop Share</span>
            </button>
          )}

          <button
            onClick={onExit}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Audience Roster Drawer */}
      {showAudienceList && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h4 className="font-bold text-sm text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Connected Audience</span>
            </h4>
            <span className="text-xs text-slate-400">{approvedParticipants.length} active</span>
          </div>

          {approvedParticipants.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              No viewers connected yet. Invite someone using room code: <strong className="text-slate-300">{roomCode}</strong>
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {approvedParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="font-medium text-white">{p.displayName}</span>
                    <span className="text-[10px] text-slate-500">
                      Joined {new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <button
                    onClick={() => kickViewer(p.id)}
                    className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-800/60 text-red-300 rounded-lg text-[10px] font-semibold transition"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals & Floating Drawers */}
      <ShareModal
        roomCode={roomCode}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
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
