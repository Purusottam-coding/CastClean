import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
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
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <span className="font-semibold text-sm text-white">Share Room Details</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
              Room Code
            </span>
            <div className="text-2xl font-mono font-bold tracking-widest text-indigo-300">
              {roomCode}
            </div>
            <button
              onClick={copyCode}
              className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              {copiedCode ? 'Copied code' : 'Copy code'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Direct Link
            </label>
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono truncate"
              />
              <button
                onClick={copyUrl}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition"
        >
          Done
        </button>
      </div>
    </div>
  );
};
