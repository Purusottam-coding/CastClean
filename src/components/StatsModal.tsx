import React from 'react';
import { X, Activity } from 'lucide-react';
import type { WebRTCStats } from '../types';

interface StatsModalProps {
  stats: WebRTCStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm text-white">WebRTC Connection Stats</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800/80">
            <span className="text-slate-400">Round Trip Time (RTT):</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {stats?.rttMs !== undefined ? `${stats.rttMs} ms` : 'N/A'}
            </span>
          </div>

          <div className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800/80">
            <span className="text-slate-400">Frames Per Second:</span>
            <span className="font-mono text-white font-semibold">
              {stats?.fps || 0} fps
            </span>
          </div>

          <div className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800/80">
            <span className="text-slate-400">Resolution:</span>
            <span className="font-mono text-white">
              {stats?.width && stats?.height ? `${stats.width}x${stats.height}` : 'Active'}
            </span>
          </div>

          <div className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800/80">
            <span className="text-slate-400">Estimated Bitrate:</span>
            <span className="font-mono text-white">
              {stats?.bitrateKbps ? `${stats.bitrateKbps} kbps` : 'Variable'}
            </span>
          </div>

          <div className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800/80">
            <span className="text-slate-400">Packet Loss:</span>
            <span className="font-mono text-slate-300">
              {stats?.packetLossPercent ?? 0}%
            </span>
          </div>

          <div className="flex justify-between p-2 bg-slate-950 rounded border border-slate-800/80">
            <span className="text-slate-400">Transport:</span>
            <span className="font-mono text-slate-300">WebRTC DTLS/SRTP (UDP)</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
