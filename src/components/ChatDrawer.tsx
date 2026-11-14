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

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-40 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white p-3 rounded-full shadow-lg transition flex items-center justify-center relative"
      >
        <MessageSquare className="w-4 h-4" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 h-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center space-x-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-xs text-white">DataChannel Chat</span>
          <span className="text-[10px] text-slate-500">({messages.length})</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
        {messages.length === 0 ? (
          <p className="text-slate-500 text-center py-8 text-[11px]">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="space-y-0.5">
              <div className="flex items-center space-x-1.5">
                <span className={`font-semibold ${m.isHost ? 'text-indigo-400' : 'text-slate-300'}`}>
                  {m.sender}
                </span>
                <span className="text-[10px] text-slate-500">{m.time}</span>
              </div>
              <p className="text-slate-200 bg-slate-950 rounded px-2.5 py-1.5 border border-slate-800 break-words">
                {m.text}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-slate-800 bg-slate-950 flex space-x-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
