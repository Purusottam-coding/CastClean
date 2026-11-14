import React, { useEffect, useRef, useState } from 'react';
import {
  Cast,
  Users,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Share2,
  ScreenShareOff,
  Check,
  X,
  AlertTriangle,
  MessageSquare,
  LogOut,
  Pause,
  Play,
  EyeOff,
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
    isScreenAudioMuted,
    isHostMicMuted,
    micError,
    clearMicError,
    participants,
    chatMessages,
    screenStream,
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

  // Shortcut: Press P to toggle Pause / Privacy Curtain
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

      {micError && (
        <div className="p-3 bg-red-950/70 border border-red-800 rounded-lg flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{micError}</span>
          </div>
          <button
            onClick={clearMicError}
            className="text-zinc-400 hover:text-white px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Knocking Viewers Gatekeeper Tray */}
      {knockingParticipants.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
              <span className="text-xs font-semibold text-white">
                {knockingParticipants.length} viewer{knockingParticipants.length > 1 ? 's' : ''} requesting access:
              </span>
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              {knockingParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center space-x-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800 text-xs"
                >
                  <span className="text-zinc-300 font-medium">{p.displayName}</span>
                  <button
                    onClick={() => approveViewer(p.id)}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                    title="Allow"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => declineViewer(p.id)}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 border border-zinc-700 transition"
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
      <div className="relative w-full aspect-video bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center">
        {isSharing ? (
          <>
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />

            {/* Natural Screen Paused Overlay on Preview */}
            {isCurtainActive && (
              <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-10">
                <EyeOff className="w-8 h-8 text-zinc-400 mb-2 stroke-[1.5]" />
                <h3 className="text-sm font-semibold text-zinc-100">Screen Sharing Paused</h3>
                <p className="text-xs text-zinc-400 mt-0.5 max-w-xs">
                  Your screen is hidden from viewers.
                </p>
                <button
                  onClick={togglePrivacyCurtain}
                  className="mt-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium rounded-lg transition"
                >
                  Resume Screen (P)
                </button>
              </div>
            )}

            {/* In-Preview Status Badges */}
            <div className="absolute top-3 left-3 flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-medium text-zinc-200">
                Live Preview
              </span>
              {isCurtainActive && (
                <span className="px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-700 text-[11px] font-medium text-zinc-300 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                  <span>Paused</span>
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6">
            <Cast className="w-10 h-10 text-zinc-600 mb-2" />
            <h3 className="text-sm font-semibold text-zinc-200">No Screen Active</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              Select an application window, screen, or browser tab to start streaming.
            </p>
            <button
              onClick={startSharing}
              disabled={!peerReady}
              className="px-4 py-2 bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
            >
              <Cast className="w-3.5 h-3.5" />
              <span>{peerReady ? 'Share Screen' : 'Connecting Broker...'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          {/* Host Microphone Toggle */}
          <button
            onClick={toggleHostMic}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition ${
              isHostMicMuted
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/50'
            }`}
            title={isHostMicMuted ? 'Unmute Host Microphone' : 'Mute Host Microphone'}
          >
            {isHostMicMuted ? (
              <>
                <MicOff className="w-3.5 h-3.5 text-zinc-400" />
                <span>Mic Muted</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mic On</span>
              </>
            )}
          </button>

          {/* Screen Streaming Controls (Pause / Resume & Screen Audio) */}
          {isSharing && (
            <>
              <button
                onClick={togglePrivacyCurtain}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center space-x-1.5 ${
                  isCurtainActive
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700'
                }`}
                title="Shortcut: P"
              >
                {isCurtainActive ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-zinc-200" />
                    <span>Resume Screen</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Pause Screen (P)</span>
                  </>
                )}
              </button>

              {(screenStream?.getAudioTracks().length ?? 0) > 0 && (
                <button
                  onClick={toggleScreenAudio}
                  className={`px-2.5 py-1.5 rounded-lg text-xs border transition flex items-center space-x-1.5 ${
                    isScreenAudioMuted
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                      : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:text-white'
                  }`}
                  title={isScreenAudioMuted ? 'Unmute Screen Audio' : 'Mute Screen Audio'}
                >
                  {isScreenAudioMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[11px]">Desktop Audio Off</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
                      <span className="text-[11px]">Desktop Audio On</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Center: Invite, Viewers, Chat */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>

          <button
            onClick={() => setShowAudienceList(!showAudienceList)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Viewers ({approvedParticipants.length})</span>
          </button>

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
        </div>

        {/* Right: Stop Share & Leave */}
        <div className="flex items-center space-x-2">
          {isSharing && (
            <button
              onClick={stopSharing}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center space-x-1.5 transition"
              title="Stop Screen Sharing"
            >
              <ScreenShareOff className="w-3.5 h-3.5 text-zinc-400" />
              <span>Stop Share</span>
            </button>
          )}

          <button
            onClick={onExit}
            className="px-3.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-300 hover:text-red-200 border border-red-800/50 text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Audience Roster */}
      {showAudienceList && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 mb-2.5">
            <span className="text-xs font-semibold text-white">Active Viewers</span>
            <span className="text-xs text-zinc-400">{approvedParticipants.length} connected</span>
          </div>

          {approvedParticipants.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2">No viewers connected.</p>
          ) : (
            <div className="space-y-1.5">
              {approvedParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg border border-zinc-800/80 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-zinc-200">{p.displayName}</span>
                    {p.isMicMuted ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-900 text-zinc-500 border border-zinc-800 flex items-center space-x-1">
                        <MicOff className="w-3 h-3" />
                        <span>Muted</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 flex items-center space-x-1">
                        <Mic className="w-3 h-3" />
                        <span>Speaking</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {!p.isMicMuted && (
                      <button
                        onClick={() => forceMuteViewer(p.id)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700"
                        title="Mute viewer"
                      >
                        Mute
                      </button>
                    )}
                    <button
                      onClick={() => kickViewer(p.id)}
                      className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 text-[11px]"
                    >
                      Disconnect
                    </button>
                  </div>
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
