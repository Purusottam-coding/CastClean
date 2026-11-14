import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { HostView } from './components/HostView';
import { ViewerView } from './components/ViewerView';
import { sanitizeRoomCode } from './utils/room';

export function App() {
  const [role, setRole] = useState<'landing' | 'host' | 'viewer'>('landing');
  const [roomCode, setRoomCode] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [requireApproval, setRequireApproval] = useState<boolean>(true);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header
        roomCode={role !== 'landing' ? roomCode : undefined}
        role={role !== 'landing' ? role : undefined}
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
    </div>
  );
}

export default App;
