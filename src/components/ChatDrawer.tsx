import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isHost?: boolean;
}

interface ChatDrawerProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  onSendMessage,
  isOpen,
  onToggle,
}) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-5 z-40 w-80 sm:w-88 h-[420px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-zinc-300" />
          <span className="font-semibold text-xs text-zinc-100">Messages</span>
          {messages.length > 0 && (
            <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.2 rounded-full border border-zinc-700">
              {messages.length}
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Close Chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-2 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-zinc-500 mb-2.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-zinc-300">No messages yet</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Send a message to everyone in the room.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const prevMessage = idx > 0 ? messages[idx - 1] : null;
            const isSameSender = prevMessage && prevMessage.sender === m.sender;

            return (
              <div key={m.id} className={`space-y-0.5 ${isSameSender ? 'pt-0.5' : 'pt-2'}`}>
                {!isSameSender && (
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-semibold text-[11px] ${m.isHost ? 'text-zinc-100' : 'text-zinc-300'}`}>
                        {m.sender}
                      </span>
                      {m.isHost && (
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Host
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500">{m.time}</span>
                  </div>
                )}
                <div className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800/90 text-zinc-200 text-xs leading-relaxed break-words">
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-zinc-800 bg-zinc-950/70">
        <div className="flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-zinc-500 rounded-xl px-3 py-1.5 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 transition shrink-0 ml-1.5"
            title="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
