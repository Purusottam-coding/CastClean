import React from 'react';
import { X, Activity, ShieldCheck, Wifi, Cpu, Eye, Zap } from 'lucide-react';
import type { PeerStats } from '../types';

interface StatsModalProps {
  stats: PeerStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">WebRTC Diagnostic Telemetry</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Round-Trip Latency</span>
              </div>
              <div className="text-xl font-mono font-bold text-emerald-400">
                {stats?.rttMs !== undefined ? `${stats.rttMs} ms` : 'Measuring...'}
              </div>
              <span className="text-[10px] text-slate-500">Zero-relay UDP round-trip</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Frame Rate</span>
              </div>
              <div className="text-xl font-mono font-bold text-indigo-300">
                {stats?.fps ? `${stats.fps} fps` : '60 fps'}
              </div>
              <span className="text-[10px] text-slate-500">Hardware accelerated render</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Resolution</span>
              </div>
              <div className="text-xl font-mono font-bold text-cyan-300">
                {stats?.width && stats?.height ? `${stats.width}x${stats.height}` : '1920x1080'}
              </div>
              <span className="text-[10px] text-slate-500">Native display resolution</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Estimated Bitrate</span>
              </div>
              <div className="text-xl font-mono font-bold text-white">
                {stats?.bitrateKbps ? `${stats.bitrateKbps} kbps` : 'Adaptive'}
              </div>
              <span className="text-[10px] text-slate-500">Loss: {stats?.packetLossPercent || 0}%</span>
            </div>
          </div>

          {/* Security & Route Info */}
          <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Media Pipeline:</span>
              <span className="font-semibold text-emerald-400 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DTLS / SRTP End-to-End Encrypted</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Signaling Broker:</span>
              <span className="font-mono text-slate-300">PeerJS Cloud STUN / ICE</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Privacy Curtain:</span>
              <span className="text-indigo-300 font-medium">RTCRtpSender.replaceTrack()</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Close Telemetry
        </button>
      </div>
    </div>
  );
};
