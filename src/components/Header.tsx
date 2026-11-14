import React from 'react';
import { Cast, Shield, Copy, Check } from 'lucide-react';
import { getRoomShareUrl } from '../utils/room';

interface HeaderProps {
  roomCode?: string;
  role?: 'host' | 'viewer';
  onOpenStats?: () => void;
  hasStats?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  role,
  onOpenStats,
  hasStats,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(getRoomShareUrl(roomCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <Cast className="w-6 h-6 text-zinc-100" />
          <span className="font-bold text-base tracking-tight text-white">CastClean</span>
        </div>

        {/* Center Room Code Pill */}
        {roomCode && (
          <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-zinc-400">Room:</span>
            <span className="font-mono font-semibold text-zinc-200">{roomCode}</span>
            <button
              onClick={handleCopyLink}
              title="Copy share link"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          {hasStats && onOpenStats && (
            <button
              onClick={onOpenStats}
              className="px-2.5 py-1 rounded text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition"
            >
              Telemetry
            </button>
          )}

          {role && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center space-x-1">
              {role === 'host' && <Shield className="w-3 h-3 text-zinc-400" />}
              <span className="capitalize">{role}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
