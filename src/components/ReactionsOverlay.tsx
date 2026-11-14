import React from 'react';

interface ReactionItem {
  id: string;
  emoji: string;
  senderName: string;
}

interface ReactionsOverlayProps {
  reactions: ReactionItem[];
}

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({ reactions }) => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-30">
      {reactions.map((r, idx) => {
        // Randomize horizontal placement slightly
        const leftPercent = 30 + ((idx * 17) % 50);
        return (
          <div
            key={r.id}
            className="absolute bottom-12 flex flex-col items-center animate-bounce-float"
            style={{
              left: `${leftPercent}%`,
              animation: 'floatUp 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            }}
          >
            <span className="text-4xl drop-shadow-lg filter select-none">
              {r.emoji}
            </span>
            <span className="text-[11px] font-medium bg-slate-900/80 backdrop-blur-sm text-slate-200 px-2 py-0.5 rounded-full border border-slate-700/50 mt-1 shadow">
              {r.senderName}
            </span>
          </div>
        );
      })}

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.6);
          }
          15% {
            opacity: 1;
            transform: translateY(0px) scale(1.15);
          }
          40% {
            transform: translateY(-80px) scale(1) translateX(10px);
          }
          75% {
            opacity: 0.9;
            transform: translateY(-200px) scale(0.95) translateX(-8px);
          }
          100% {
            opacity: 0;
            transform: translateY(-320px) scale(0.8) translateX(6px);
          }
        }
      `}</style>
    </div>
  );
};
