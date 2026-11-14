import React from 'react';
import { X, Shield, Lock, Radio, Tv, Layers } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">CastClean Architecture & Privacy Controls</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5 text-xs text-slate-300 leading-relaxed">
          <p>
            Unlike traditional video conferencing software that uploads, transcodes, and relays screen pixels through intermediate media servers (SFUs/MCUs), <strong className="text-white">CastClean</strong> connects the host directly to viewers over peer-to-peer WebRTC.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                1
              </div>
              <h4 className="font-semibold text-white flex items-center space-x-1">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                <span>Broker Handshake</span>
              </h4>
              <p className="text-slate-400 text-[11px]">
                Host registers a 6-character room ID (e.g. <code className="text-indigo-300">castclean-K7M9P2</code>). Viewer connects via reliable DataChannel.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/20">
                2
              </div>
              <h4 className="font-semibold text-white flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Privacy Lobby Gate</span>
              </h4>
              <p className="text-slate-400 text-[11px]">
                Viewer enters a waiting lobby. If approval is required, host sees the knock and clicks Allow or Decline before any video packets stream.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                3
              </div>
              <h4 className="font-semibold text-white flex items-center space-x-1">
                <Tv className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Delay P2P</span>
              </h4>
              <p className="text-slate-400 text-[11px]">
                Direct encrypted UDP connection transmits 60fps screen frames with sub-50ms latency. No video ever touches a backend server.
              </p>
            </div>
          </div>

          {/* Privacy Curtain Highlight */}
          <div className="p-4 bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-slate-950 rounded-xl border border-violet-800/40 space-y-2">
            <div className="flex items-center space-x-2 text-violet-300 font-semibold">
              <Lock className="w-4 h-4" />
              <span>Zero-Leak Privacy Curtain</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              When the host engages the <strong>Privacy Curtain</strong> (e.g., to enter credentials or check personal messages), CastClean uses <code className="bg-slate-900 px-1 py-0.5 rounded text-violet-200">RTCRtpSender.replaceTrack()</code> to instantly swap the live screen track with an active synthetic curtain canvas.
            </p>
            <p className="text-slate-400 text-[11px]">
              This guarantees that not a single private pixel leaks, avoids frozen video decoder bugs, and allows instant resumption without WebRTC renegotiation lag.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
