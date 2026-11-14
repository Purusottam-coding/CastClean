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
  Clock,
  UserCheck,
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
    <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col space-y-4">
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

      {/* Main Grid: Left = Compact Preview & Controls, Right = Waiting & Active Viewers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Compact Screen Preview + Control Console */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {/* Compact Live Preview Container */}
          <div className="relative w-full aspect-video max-h-[460px] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center shadow-lg">
            {isSharing ? (
              <>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />

                {/* Privacy Screen Paused Overlay */}
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

                {/* In-Preview Badges */}
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
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
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

              {/* Pause / Resume Screen */}
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

            {/* Center / Actions: Invite & Chat */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center space-x-1.5 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Invite</span>
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

            {/* Right: Stop Share & Soft Red Leave */}
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
        </div>

        {/* Right Column: Waiting (Requests) + Active Viewers Section */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Waiting Section (Knocking Viewers requesting access) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-100 tracking-wide">
                  Waiting
                </span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  knockingParticipants.length > 0
                    ? 'bg-zinc-700 text-zinc-100 font-semibold'
                    : 'bg-zinc-950 text-zinc-500 border border-zinc-800'
                }`}
              >
                {knockingParticipants.length}
              </span>
            </div>

            {/* Waiting List */}
            <div className="mt-3 space-y-2">
              {knockingParticipants.length === 0 ? (
                <div className="text-center py-5 px-2">
                  <UserCheck className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-zinc-400">No viewers waiting</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Viewers requesting access will appear here.
                  </p>
                </div>
              ) : (
                knockingParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-200 font-semibold text-xs">
                        {p.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">
                          {p.displayName}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          Requesting access...
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => approveViewer(p.id)}
                        className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 text-xs font-medium flex items-center space-x-1 transition shadow-sm"
                        title="Allow Viewer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Allow</span>
                      </button>
                      <button
                        onClick={() => declineViewer(p.id)}
                        className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-300 text-xs font-medium flex items-center space-x-1 transition"
                        title="Decline Viewer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Viewers Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-100 tracking-wide">
                  Active Viewers
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-400 border border-zinc-800">
                {approvedParticipants.length}
              </span>
            </div>

            {/* Connected Viewers List */}
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-0.5">
              {approvedParticipants.length === 0 ? (
                <div className="text-center py-5 px-2">
                  <Users className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-zinc-400">No viewers connected</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Share room code or invite link to connect.
                  </p>
                </div>
              ) : (
                approvedParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 text-xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-300 font-semibold text-[11px]">
                        {p.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-200 truncate">{p.displayName}</div>
                        <div className="mt-0.5">
                          {p.isMicMuted ? (
                            <span className="text-[10px] text-zinc-500 flex items-center space-x-1">
                              <MicOff className="w-2.5 h-2.5" />
                              <span>Muted</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                              <Mic className="w-2.5 h-2.5" />
                              <span>Speaking</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {!p.isMicMuted && (
                        <button
                          onClick={() => forceMuteViewer(p.id)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] border border-zinc-700 transition"
                          title="Mute viewer"
                        >
                          Mute
                        </button>
                      )}
                      <button
                        onClick={() => kickViewer(p.id)}
                        className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-[11px] transition"
                        title="Disconnect viewer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

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
