import React, { useState } from 'react';
import { X, Copy, Check, Share2, Link as LinkIcon, Radio } from 'lucide-react';
import { getRoomShareUrl } from '../utils/room';

interface ShareModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ roomCode, isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const shareUrl = getRoomShareUrl(roomCode);

  const copyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Invite Viewers to Screen</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Big Room Code Box */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              6-Character Room Code
            </span>
            <div className="text-3xl font-mono font-black tracking-widest text-indigo-300 py-1">
              {roomCode}
            </div>
            <button
              onClick={copyCode}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied code!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Share Link */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Direct Invite Link
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 truncate">
                {shareUrl}
              </div>
              <button
                onClick={copyUrl}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <LinkIcon className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0 animate-pulse" />
            <span>
              Viewers who click this link will directly connect to your browser. You will still approve or decline them if gatekeeper approval is active.
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Done
        </button>
      </div>
    </div>
  );
};
