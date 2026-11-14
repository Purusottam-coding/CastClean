import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { HostView } from './components/HostView';
import { ViewerView } from './components/ViewerView';
import { ArchitectureModal } from './components/ArchitectureModal';
import { sanitizeRoomCode } from './utils/room';

export function App() {
  const [role, setRole] = useState<'landing' | 'host' | 'viewer'>('landing');
  const [roomCode, setRoomCode] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [requireApproval, setRequireApproval] = useState<boolean>(true);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);

  // Check URL params on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      const clean = sanitizeRoomCode(roomFromUrl);
      if (clean) {
        setRoomCode(clean);
      }
    }
  }, []);

  const handleStartHost = (code: string, name: string, reqApproval: boolean) => {
    setRoomCode(code);
    setDisplayName(name);
    setRequireApproval(reqApproval);
    setRole('host');

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    window.history.pushState({}, '', url.toString());
  };

  const handleJoinViewer = (code: string, name: string) => {
    setRoomCode(code);
    setDisplayName(name);
    setRole('viewer');

    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    window.history.pushState({}, '', url.toString());
  };

  const handleExit = () => {
    setRole('landing');
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
      </div>

      <Header
        roomCode={role !== 'landing' ? roomCode : undefined}
        role={role !== 'landing' ? role : undefined}
        onOpenArchitecture={() => setIsArchModalOpen(true)}
      />

      <main className="flex-1 flex flex-col justify-center">
        {role === 'landing' && (
          <LandingView
            initialRoomCode={roomCode}
            onStartHost={handleStartHost}
            onJoinViewer={handleJoinViewer}
          />
        )}

        {role === 'host' && (
          <HostView
            roomCode={roomCode}
            hostName={displayName}
            requireApproval={requireApproval}
            onExit={handleExit}
          />
        )}

        {role === 'viewer' && (
          <ViewerView
            roomCode={roomCode}
            displayName={displayName}
            onExit={handleExit}
          />
        )}
      </main>

      <footer className="w-full border-t border-slate-900/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            CastClean — Zero-Delay Peer-to-Peer Screen Sharing & Privacy Curtains
          </p>
          <div className="flex items-center space-x-4 text-slate-400">
            <button
              onClick={() => setIsArchModalOpen(true)}
              className="hover:text-indigo-400 transition"
            >
              Architecture & Protocols
            </button>
            <span>•</span>
            <span className="text-slate-500">DTLS / SRTP End-to-End Encrypted</span>
          </div>
        </div>
      </footer>

      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />
    </div>
  );
}

export default App;
