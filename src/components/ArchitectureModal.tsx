import React from 'react';
import { X, Layers } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-xl p-5 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-sm text-white">CastClean Architecture</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-normal">
          <p>
            CastClean operates entirely peer-to-peer over WebRTC, eliminating media server upload and transcode hops.
          </p>

          <div className="space-y-2 border-l-2 border-indigo-500/50 pl-3">
            <h4 className="font-semibold text-white">1. Signaling Handshake (PeerJS Broker)</h4>
            <p className="text-slate-400">
              Host registers a 6-character room ID prefixed with <code className="text-slate-200">castclean-</code>. Viewer connects to that ID using a reliable WebRTC DataChannel (<code className="text-slate-200">peer.connect</code>).
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-amber-500/50 pl-3">
            <h4 className="font-semibold text-white">2. Privacy Lobby Gatekeeper</h4>
            <p className="text-slate-400">
              Before video frames are transmitted, the Viewer sends a <code className="text-slate-200">REQUEST_ACCESS</code> payload containing their display name. If approval is required, the host explicitly clicks Allow or Decline.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-emerald-500/50 pl-3">
            <h4 className="font-semibold text-white">3. Direct P2P Media Stream</h4>
            <p className="text-slate-400">
              Once approved, the Host initiates a WebRTC MediaConnection (<code className="text-slate-200">peer.call</code>) directly to the Viewer’s browser over encrypted UDP/ICE channels.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-slate-600 pl-3">
            <h4 className="font-semibold text-white">4. Privacy Curtain (Track Replace)</h4>
            <p className="text-slate-400">
              Host replaces the active video track on all peer senders using <code className="text-slate-200">RTCRtpSender.replaceTrack()</code> with an active standby slate, preventing frame leaks with zero renegotiation latency.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
