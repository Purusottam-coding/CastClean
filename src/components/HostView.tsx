import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  Cast,
  Users,
  Mic,
  MicOff,
  Share2,
  Square,
  Check,
  X,
  AlertTriangle,
  Lock,
  MessageSquare,
  LogOut,
} from 'lucide-react';
import { useHostSession } from '../hooks/useHostSession';
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

  useEffect(() => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = screenStream || null;
    }
  }, [screenStream]);

  // Shortcut: Press P to toggle Privacy Curtain
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
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
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col space-y-4">
      {peerError && (
        <div className="p-3 bg-red-950/70 border border-red-800 rounded-lg flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{peerError}</span>
          </div>
          <button
            onClick={onExit}
            className="px-2.5 py-1 bg-red-800 hover:bg-red-700 rounded text-white"
          >
            Leave
          </button>
        </div>
      )}

      {/* Knocking Viewers Gatekeeper Tray */}
      {knockingParticipants.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-xs font-semibold text-white">
                {knockingParticipants.length} viewer{knockingParticipants.length > 1 ? 's' : ''} requesting access:
              </span>
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              {knockingParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs"
                >
                  <span className="text-slate-300 font-medium">{p.displayName}</span>
                  <button
                    onClick={() => approveViewer(p.id)}
                    className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
                    title="Allow"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => declineViewer(p.id)}
                    className="p-1 rounded bg-red-600 hover:bg-red-500 text-white transition"
                    title="Decline"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Container */}
      <div className="relative w-full aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
        {isSharing ? (
          <>
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />

            {/* Privacy Curtain Overlay on Preview */}
            {isCurtainActive && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-10">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Privacy Curtain Active</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Screen track replaced with standby slate. Viewers cannot see your display.
                </p>
                <button
                  onClick={togglePrivacyCurtain}
                  className="mt-3 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition"
                >
                  Resume Screen (P)
                </button>
              </div>
            )}

            {/* In-Preview Status Badges */}
            <div className="absolute top-3 left-3 flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-200">
                Live Preview
              </span>
              {isCurtainActive && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[11px] font-semibold text-amber-300">
                  Curtain On
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6">
            <Cast className="w-10 h-10 text-slate-600 mb-2" />
            <h3 className="text-sm font-semibold text-slate-200">No Screen Active</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Select an application window, screen, or browser tab to start streaming.
            </p>
            <button
              onClick={startSharing}
              disabled={!peerReady}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Cast className="w-3.5 h-3.5" />
              <span>{peerReady ? 'Share Screen' : 'Connecting Broker...'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          {isSharing ? (
            <>
              <button
                onClick={togglePrivacyCurtain}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                  isCurtainActive
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
                title="Press P"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{isCurtainActive ? 'Resume Stream' : 'Privacy Curtain (P)'}</span>
              </button>

              <button
                onClick={toggleAudio}
                className={`p-2 rounded-lg text-xs border transition ${
                  isAudioMuted
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </>
          ) : (
            <button
              onClick={startSharing}
              disabled={!peerReady}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition"
            >
              <Cast className="w-3.5 h-3.5" />
              <span>Share Screen</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>

          <button
            onClick={() => setShowAudienceList(!showAudienceList)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Viewers ({approvedParticipants.length})</span>
          </button>

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition ${
              isChatOpen
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
            {chatMessages.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-indigo-600 text-white rounded-full">
                {chatMessages.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {isSharing && (
            <button
              onClick={stopSharing}
              className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-medium flex items-center space-x-1.5 transition"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Share</span>
            </button>
          )}

          <button
            onClick={onExit}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Audience Roster */}
      {showAudienceList && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-2.5">
            <span className="text-xs font-semibold text-white">Active Viewers</span>
            <span className="text-xs text-slate-400">{approvedParticipants.length} connected</span>
          </div>

          {approvedParticipants.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No viewers connected.</p>
          ) : (
            <div className="space-y-1.5">
              {approvedParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800/80 text-xs"
                >
                  <span className="font-medium text-slate-200">{p.displayName}</span>
                  <button
                    onClick={() => kickViewer(p.id)}
                    className="px-2 py-0.5 rounded bg-red-950 hover:bg-red-900 border border-red-800/60 text-red-300 text-[11px]"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
