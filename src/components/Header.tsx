import React from 'react';
import { Cast, Shield, Copy, Check, Radio, HelpCircle } from 'lucide-react';
import { getRoomShareUrl } from '../utils/room';

interface HeaderProps {
  roomCode?: string;
  role?: 'host' | 'viewer';
  onOpenArchitecture?: () => void;
  onOpenStats?: () => void;
  hasStats?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  role,
  onOpenArchitecture,
  onOpenStats,
  hasStats,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(getRoomShareUrl(roomCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cast className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CastClean
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                P2P
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Zero-Delay Direct Browser Streaming
            </p>
          </div>
        </div>

        {/* Center Room Code Pill if in session */}
        {roomCode && (
          <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-full px-3 py-1 text-xs shadow-inner">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">Room:</span>
            <span className="font-mono font-bold tracking-wider text-slate-100">
              {roomCode}
            </span>
            <button
              onClick={handleCopyLink}
              title="Copy shareable link"
              className="ml-1 p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {hasStats && onOpenStats && (
            <button
              onClick={onOpenStats}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center space-x-1.5"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="hidden sm:inline">WebRTC Stats</span>
            </button>
          )}

          {role && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center space-x-1">
              {role === 'host' ? (
                <>
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span>Host</span>
                </>
              ) : (
                <span>Viewer</span>
              )}
            </span>
          )}

          {onOpenArchitecture && (
            <button
              onClick={onOpenArchitecture}
              title="Architecture & Privacy Info"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
