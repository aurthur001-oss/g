import React, { useState, useEffect } from 'react';
import {
  Video,
  Terminal,
  Activity as ActivityIcon,
  UserPlus,
  Calendar,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { Logo } from './components/Logo';
import MeetCall from './components/MeetCall';
import { LoggingService } from './services/LoggingService';
import { ContactManager } from './components/ContactManager';
import { Auth } from './components/Auth';

interface User {
  username: string;
  name: string;
  isAdmin?: boolean;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMeetActive, setIsMeetActive] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showContactManager, setShowContactManager] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledMeetings, setScheduledMeetings] = useState<any[]>([]);
  const [nodeStats, setNodeStats] = useState({ traffic: '0.0 kbps', latency: '12ms', peers: 1429 });

  useEffect(() => {
    const session = localStorage.getItem('ghost_session');
    if (session) {
      setCurrentUser(JSON.parse(session));
    }
    const savedMeetings = localStorage.getItem('ghost_scheduled_meetings');
    if (savedMeetings) {
      setScheduledMeetings(JSON.parse(savedMeetings));
    }
    const savedTheme = localStorage.getItem('ghost_theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.className = savedTheme === 'light' ? 'light-mode' : '';
    }

    // Check for direct join URL parameter (e.g., ?room=XYZ)
    const urlParams = new URLSearchParams(window.location.search);
    let roomParam = urlParams.get('room');
    
    if (roomParam) {
      sessionStorage.setItem('pending_room', roomParam.toUpperCase());
      // Clean up the URL securely
      // @ts-ignore
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      roomParam = sessionStorage.getItem('pending_room');
    }

    if (roomParam) {
      setJoinRoomId(roomParam.toUpperCase());
      setIsMeetActive(true);
      // Remove it from session storage only after we successfully start joining
      if (session) {
         sessionStorage.removeItem('pending_room');
      }
    }

    const interval = setInterval(() => {
      setNodeStats((prev) => ({
        ...prev,
        traffic: `${(Math.random() * 3).toFixed(1)} mbps`,
        latency: `${Math.floor(Math.random() * 15 + 5)}ms`,
        peers: prev.peers + (Math.random() > 0.5 ? 1 : -1)
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('ghost_theme', newTheme);
    document.body.className = newTheme === 'light' ? 'light-mode' : '';
  };

  const startMeeting = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setJoinRoomId(newRoomId);
    setIsMeetActive(true);
    LoggingService.logEvent('meeting_created', {
      meetingId: newRoomId,
      host: currentUser?.username || 'unknown',
      timestamp: Date.now()
    });
  };

  const joinMeeting = (id: string) => {
    setJoinRoomId(id);
    setIsMeetActive(true);
    setShowJoinModal(false);
    LoggingService.logEvent('participant_joined', {
      meetingId: id,
      user: currentUser?.username || 'unknown',
      timestamp: Date.now()
    });
  };

  const closeMeeting = () => {
    if (joinRoomId) {
      LoggingService.logEvent('meeting_ended', {
        meetingId: joinRoomId,
        timestamp: Date.now()
      });
    }
    setIsMeetActive(false);
    setJoinRoomId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('ghost_session');
    setCurrentUser(null);
    setIsMeetActive(false);
  };

  const scheduleMeeting = (topic: string, time: string) => {
    const newMeeting = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      topic,
      time,
      host: currentUser?.username
    };
    const updated = [...scheduledMeetings, newMeeting];
    setScheduledMeetings(updated);
    localStorage.setItem('ghost_scheduled_meetings', JSON.stringify(updated));
    setShowScheduleModal(false);
    LoggingService.logEvent('meeting_scheduled', {
      meetingId: newMeeting.id,
      topic,
      scheduledTime: time
    });
  };

  if (!currentUser) {
    return <Auth onAuthenticate={setCurrentUser} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-cyan-500/30 overflow-hidden">
      <header className="h-14 bg-[var(--panel)] border-b border-[var(--border)] flex items-center px-4 justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Logo size={28} animate={isMeetActive} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-tighter text-[var(--accent)] uppercase leading-none">Video Infrastructure</span>
            <span className="text-[7px] font-bold text-[var(--subtext)] uppercase tracking-widest mt-0.5">User: {currentUser.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-8 flex items-center justify-center border border-[var(--border)] rounded-sm text-[var(--text)] hover:border-[var(--accent)]/40 bg-[var(--btn-bg)] transition-all" title="Toggle Theme">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button onClick={handleLogout} className="px-3 h-8 flex items-center justify-center border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest hover:bg-red-500/10 bg-red-500/5 transition-all gap-2" title="Sign Out">
            <LogOut size={12} />
            <span className="hidden lg:inline">Disconnect</span>
          </button>

          <div className="flex gap-2">
            <button onClick={() => setShowContactManager(true)} className="w-9 h-8 flex items-center justify-center border border-[var(--border)] rounded-sm bg-[var(--btn-bg)] text-[var(--text)] hover:border-[var(--accent)]/40 transition-all">
              <UserPlus size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col overflow-hidden bg-[var(--bg)] mesh-grid">
        {!isMeetActive ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-1000">
            <Logo size={80} className="mb-8" animate={true} />
            <h1 className="text-4xl md:text-5xl font-light tracking-tighter text-[var(--text)] mb-4 italic chromatic">Secure Communication</h1>
            <p className="text-[10px] font-black text-[var(--subtext)] uppercase tracking-[0.4em] mb-12">Encrypted Video Infrastructure</p>

            <div className="flex flex-col md:flex-row gap-6 w-full max-w-lg">
              <button
                onClick={startMeeting}
                className="flex-1 bg-white text-black py-6 px-8 flex flex-col items-center justify-center gap-4 hover:bg-cyan-500 transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Video className="relative z-10" size={32} />
                <div className="text-center relative z-10">
                  <span className="block text-[10px] font-black uppercase tracking-[0.2em]">New</span>
                  <span className="block text-lg font-light italic mt-1">Meeting</span>
                </div>
              </button>

              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex-1 bg-white/[0.02] border border-white/5 text-white py-6 px-8 flex flex-col items-center justify-center gap-4 hover:border-cyan-500/40 transition-all duration-500 group relative"
              >
                <Calendar className="text-zinc-800 group-hover:text-cyan-500 transition-colors" size={32} />
                <div className="text-center">
                  <span className="block text-[10px] font-black text-zinc-800 uppercase tracking-[0.2em] group-hover:text-cyan-900">Schedule</span>
                  <span className="block text-lg font-light italic mt-1">Room</span>
                </div>
              </button>

              <button
                onClick={() => setShowJoinModal(true)}
                className="flex-1 bg-black border border-white/10 text-white py-6 px-8 flex flex-col items-center justify-center gap-4 hover:border-cyan-500/40 transition-all duration-500 group"
              >
                <Terminal size={32} className="text-zinc-800 group-hover:text-cyan-500 transition-colors" />
                <div className="text-center">
                  <span className="block text-[10px] font-black text-zinc-800 uppercase tracking-[0.2em] group-hover:text-cyan-900">Join</span>
                  <span className="block text-lg font-light italic mt-1">Meeting</span>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mt-16">
              <Stat label="MESH_LATENCY" val={nodeStats.latency} />
              <Stat label="ACTIVE_NODES" val={nodeStats.peers.toLocaleString()} />
              <Stat label="UPLINK" val="STABLE" />
              <Stat label="ENCRYPTION" val="AES-256" />
            </div>
          </div>
        ) : (
          <MeetCall onClose={closeMeeting} externalRoomId={joinRoomId} userName={currentUser.name} />
        )}

        {showContactManager && <ContactManager onClose={() => setShowContactManager(false)} onCall={(peerId) => { joinMeeting(peerId); setShowContactManager(false); }} />}
        {showScheduleModal && <ScheduleModal onClose={() => setShowScheduleModal(false)} onSchedule={scheduleMeeting} />}
      </main>

      <footer className="h-6 px-4 bg-[var(--panel)] border-t border-[var(--border)] flex items-center justify-between text-[8px] font-bold text-[var(--subtext)] uppercase tracking-widest shrink-0 font-mono">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(0,229,255,0.6)] animate-pulse" />
            <span>Connection: Secure</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-zinc-800">
            <span>Latency: {nodeStats.latency}</span>
            <span>Uplink: 100%</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ActivityIcon size={10} className="text-cyan-900" />
          <span>Active Users: {nodeStats.peers.toLocaleString()}</span>
        </div>
      </footer>

      {showJoinModal && <JoinModal onClose={() => setShowJoinModal(false)} onJoin={joinMeeting} />}

      <div className="noise"></div>
      <div className="scanline"></div>
    </div>
  );
};

const Stat = ({ label, val }: { label: string; val: string }) => (
  <div className="flex flex-col items-center md:items-start p-4 bg-white/[0.01] border border-white/[0.02] rounded-sm hover:border-cyan-500/20 transition-all group">
    <span className="text-[8px] font-black text-[var(--subtext)] uppercase tracking-[0.2em] mb-2 group-hover:text-cyan-900 transition-colors">{label}</span>
    <span className="text-[10px] md:text-[12px] font-mono text-[var(--text)] uppercase group-hover:text-cyan-500 transition-colors">{val}</span>
  </div>
);

const JoinModal = ({ onClose, onJoin }: { onClose: () => void; onJoin: (id: string) => void }) => {
  const [id, setId] = useState('');
  return (
    <div className="fixed inset-0 z-[170] bg-black/98 flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-md bg-black border border-white/10 p-12 text-center" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-light uppercase tracking-tight text-white mb-8 italic">Meeting ID</h3>
        <input autoFocus className="w-full bg-[#050505] border border-white/10 py-5 px-8 text-white text-center text-sm font-mono tracking-[0.6em] uppercase focus:outline-none focus:border-cyan-500/40 mb-10" placeholder="GHOST-XXXX" value={id} onChange={e => setId(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && onJoin(id)} />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black text-zinc-900 hover:text-white uppercase tracking-widest">Cancel</button>
          <button onClick={() => onJoin(id)} className="flex-2 px-8 py-4 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest">Join</button>
        </div>
      </div>
    </div>
  );
};

const ScheduleModal = ({ onClose, onSchedule }: { onClose: () => void; onSchedule: (topic: string, time: string) => void }) => {
  const [topic, setTopic] = useState('');
  const [time, setTime] = useState('');
  return (
    <div className="fixed inset-0 z-[180] bg-black/95 flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-md bg-black border border-white/10 p-12" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-light uppercase tracking-tight text-white mb-8 italic text-center">Schedule Meeting</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Meeting Topic</label>
            <input autoFocus className="w-full bg-[#050505] border border-white/5 py-4 px-6 text-white text-sm font-light focus:outline-none focus:border-cyan-500/40" placeholder="e.g. MISSION BRIEFING" value={topic} onChange={e => setTopic(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Scheduled Time</label>
            <input type="datetime-local" className="w-full bg-[#050505] border border-white/5 py-4 px-6 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/40 invert" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-4 mt-12">
          <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black text-zinc-900 hover:text-white uppercase tracking-widest">Cancel</button>
          <button onClick={() => onSchedule(topic, time)} className="flex-2 px-8 py-4 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest">Schedule</button>
        </div>
      </div>
    </div>
  );
};

export default App;
