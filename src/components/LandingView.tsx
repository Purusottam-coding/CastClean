import React, { useState, useEffect } from 'react';
import { Cast, Tv, ArrowRight, RefreshCw } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'host' | 'join'>(
    initialRoomCode ? 'join' : 'host'
  );

  const [hostRoomCode, setHostRoomCode] = useState(generateRoomCode());
  const [hostName, setHostName] = useState('Host');
  const [requireApproval, setRequireApproval] = useState(true);

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
    <div className="max-w-xl mx-auto px-4 py-12 flex flex-col items-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Direct P2P Screen Sharing
        </h1>
        <p className="mt-2 text-xs text-zinc-400 max-w-md mx-auto">
          Browser-to-browser WebRTC screen transmission with track-level privacy controls and knock gatekeeper.
        </p>
      </div>

      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
        {/* Tab Switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('host')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'host'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Cast className="w-3.5 h-3.5" />
            <span>Host Screen</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'join'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Join as Viewer</span>
          </button>
        </div>

        {activeTab === 'host' ? (
          <form onSubmit={handleHostSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-zinc-300">Room Code</label>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate New</span>
                </button>
              </div>
              <input
                type="text"
                value={hostRoomCode}
                onChange={(e) => setHostRoomCode(sanitizeRoomCode(e.target.value))}
                maxLength={8}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-base font-mono font-bold text-center tracking-widest text-zinc-100 uppercase focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Host Name
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Host"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Require Approval Toggle */}
            <div
              onClick={() => setRequireApproval(!requireApproval)}
              className="flex items-center justify-between p-3.5 bg-zinc-950/80 rounded-lg border border-zinc-800 hover:border-zinc-700/80 cursor-pointer select-none transition-colors"
            >
              <div className="pr-3">
                <div className="text-xs font-semibold text-zinc-200">
                  Require approval before viewing
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Viewers wait in a lobby until you approve their request.
                </div>
              </div>

              {/* Clean neutral toggle switch */}
              <div
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                  requireApproval ? 'bg-zinc-200' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                    requireApproval ? 'translate-x-5 bg-zinc-900' : 'translate-x-0 bg-zinc-400'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-sm"
            >
              <span>Start Host Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleViewerSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                6-Character Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(sanitizeRoomCode(e.target.value))}
                placeholder="K7M9P2"
                maxLength={8}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-base font-mono font-bold text-center tracking-widest text-zinc-100 uppercase focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                value={viewerName}
                onChange={(e) => setViewerName(e.target.value)}
                placeholder="Viewer"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!joinCode}
              className="w-full py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-sm"
            >
              <span>Connect to Room</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
