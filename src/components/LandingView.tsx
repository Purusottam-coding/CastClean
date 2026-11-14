import React, { useState, useEffect } from 'react';
import { Cast, Shield, Tv, Sparkles, ArrowRight, Lock, CheckCircle2, RefreshCw } from 'lucide-react';
import { generateRoomCode, sanitizeRoomCode } from '../utils/room';

interface LandingViewProps {
  initialRoomCode?: string;
  onStartHost: (roomCode: string, hostName: string, requireApproval: boolean) => void;
  onJoinViewer: (roomCode: string, displayName: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  initialRoomCode = '',
  onStartHost,
  onJoinViewer,
}) => {
  const [activeTab, setActiveTab] = useState<'join' | 'host'>(
    initialRoomCode ? 'join' : 'host'
  );

  // Host state
  const [hostRoomCode, setHostRoomCode] = useState(generateRoomCode());
  const [hostName, setHostName] = useState('Host');
  const [requireApproval, setRequireApproval] = useState(true);

  // Viewer state
  const [joinCode, setJoinCode] = useState(initialRoomCode);
  const [viewerName, setViewerName] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setJoinCode(sanitizeRoomCode(initialRoomCode));
      setActiveTab('join');
    }
  }, [initialRoomCode]);

  const handleRegenerateCode = () => {
    setHostRoomCode(generateRoomCode());
  };

  const handleHostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostRoomCode) return;
    onStartHost(hostRoomCode, hostName.trim() || 'Host', requireApproval);
  };

  const handleViewerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeRoomCode(joinCode);
    if (!clean) return;
    onJoinViewer(clean, viewerName.trim() || 'Anonymous Viewer');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center">
      {/* Hero Badge */}
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Next-Generation Peer-to-Peer Screen Streaming</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-5xl font-black text-center tracking-tight text-white max-w-2xl leading-tight">
        Zero-Delay Screen Sharing with{' '}
        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Privacy Curtains
        </span>
      </h1>

      <p className="mt-4 text-sm sm:text-base text-slate-400 text-center max-w-xl leading-relaxed">
        Stream your screen directly browser-to-browser with WebRTC. No intermediate servers, zero transcoding lag, and instant track-level privacy controls.
      </p>

      {/* Mode Switch Card */}
      <div className="w-full max-w-md mt-10 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
        {/* Glow backdrop */}
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl -z-10 opacity-70"></div>

        {/* Tab selection */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800/80 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('host')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 ${
              activeTab === 'host'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cast className="w-4 h-4" />
            <span>Host a Screen</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 ${
              activeTab === 'join'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Join a Stream</span>
          </button>
        </div>

        {/* Tab: Host */}
        {activeTab === 'host' && (
          <form onSubmit={handleHostSubmit} className="space-y-5 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Room Code</span>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate New</span>
                </button>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={hostRoomCode}
                  onChange={(e) => setHostRoomCode(sanitizeRoomCode(e.target.value))}
                  maxLength={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-indigo-300 text-center uppercase focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 text-center">
                Signaling ID: <code className="text-slate-400 font-mono">castclean-{hostRoomCode}</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Host Display Name
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Privacy Gatekeeper Option */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                />
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Require approval before viewing
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Viewers wait in a lobby until you explicitly click Allow. Prevents unauthorized viewing.
                  </p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/30 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Create Room & Start Sharing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Tab: Join */}
        {activeTab === 'join' && (
          <form onSubmit={handleViewerSubmit} className="space-y-5 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                6-Character Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(sanitizeRoomCode(e.target.value))}
                placeholder="e.g. K7M9P2"
                maxLength={8}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-indigo-300 text-center uppercase focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                value={viewerName}
                onChange={(e) => setViewerName(e.target.value)}
                placeholder="e.g. Jordan"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>You will knock on the host lobby before receiving video frames.</span>
            </div>

            <button
              type="submit"
              disabled={!joinCode}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/30 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Knock & Join Screen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Feature Grid Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl w-full mt-16 text-slate-300">
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
            <Cast className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm mb-1">Direct Encrypted P2P</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            No intermediate video relay or SFU. WebRTC DTLS/SRTP audio & video streams straight to the viewer.
          </p>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm mb-1">Instant Privacy Curtain</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Swap to an active privacy curtain with a single keypress. Protects passwords and personal tabs with zero frozen frames.
          </p>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm mb-1">Knock & Approval Gate</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Host retains full access control. Approve or decline knocking viewers before any media bytes flow.
          </p>
        </div>
      </div>
    </div>
  );
};
