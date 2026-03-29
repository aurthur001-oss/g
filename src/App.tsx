import React, { useState, useEffect } from 'react';
import {
  Video,
  Terminal,
  Calendar,
  Activity as ActivityIcon,
  LogOut,
  Sun,
  Moon,
  Shield,
  MessageSquare,
  UserPlus
} from 'lucide-react';
import { Logo } from './components/Logo';
import MeetCall from './components/MeetCall';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { SocialManager } from './components/SocialManager';
import { DirectChat } from './components/DirectChat';
import { LoggingService } from './services/LoggingService';
import { supabase, isCloudBackupActive } from './lib/supabase';

// --- Helper Components (Hoisted to avoid TDZ) ---

function Stat({ label, val }: { label: string; val: string | number }) {
  return (
    <div className="flex flex-col gap-1 items-center md:items-start p-4 bg-white/[0.01] border border-white/[0.02] rounded-sm hover:border-cyan-500/20 transition-all group">
      <span className="text-[7px] font-black text-[var(--subtext)] uppercase tracking-[0.2em] group-hover:text-cyan-900 transition-colors">{label}</span>
      <span className="text-[10px] md:text-[12px] font-mono text-[var(--text)] uppercase group-hover:text-cyan-500 transition-colors">{val}</span>
    </div>
  );
}

function JoinModal({ onClose, onJoin }: { onClose: () => void; onJoin: (id: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--panel)] border border-[var(--border)] p-10 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-30" />
        <h2 className="text-2xl font-light italic text-white mb-2 uppercase tracking-tight">Access Signal</h2>
        <p className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-10">Uplink Authorization Required</p>
        <div className="space-y-8">
          <div className="space-y-2">
             <label className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">Channel_ID</label>
             <input autoFocus className="w-full bg-black border border-white/5 py-4 px-5 text-[12px] text-white focus:outline-none focus:border-cyan-500/30 font-mono uppercase tracking-[0.2em]" placeholder="000-000" value={val} onChange={e => setVal(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && onJoin(val)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={onClose} className="py-4 bg-white/[0.02] border border-white/5 text-zinc-600 text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">Abort</button>
            <button onClick={() => onJoin(val)} className="py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-cyan-500 transition-all">Initiate</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleModal({ onClose, onSchedule }: { onClose: () => void; onSchedule: (id: string, time: string) => void }) {
  const [id, setId] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [time, setTime] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--panel)] border border-[var(--border)] p-10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-light italic text-white mb-2 uppercase tracking-tight">Sync Planning</h2>
        <p className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mb-10">Future Signal Reservation</p>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">Meeting_ID</label>
            <input className="w-full bg-black border border-white/5 py-4 px-5 text-[12px] text-white font-mono uppercase focus:outline-none focus:border-white/20" value={id} onChange={e => setId(e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-2">
            <label className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">Target_Timestamp</label>
            <input type="datetime-local" className="w-full bg-black border border-white/5 py-4 px-5 text-[12px] text-white font-mono focus:outline-none focus:border-white/20" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <button onClick={onClose} className="py-4 bg-white/[0.02] border border-white/5 text-zinc-600 text-[9px] font-black uppercase">Cancel</button>
            <button onClick={() => onSchedule(id, time)} className="py-4 bg-white text-black text-[10px] font-black uppercase">Authorize</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface User {
  username: string;
  name: string;
  isAdmin?: boolean;
  ip?: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMeetActive, setIsMeetActive] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
  });
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showSocialManager, setShowSocialManager] = useState(false);
  const [activeChatRecipient, setActiveChatRecipient] = useState<{ username: string; name: string } | null>(null);
  const [scheduledMeetings, setScheduledMeetings] = useState<any[]>([]);
  const [nodeStats, setNodeStats] = useState({ traffic: '0.0 kbps', latency: '12ms', peers: 1429 });
  
  // Guest Session Security State
  const [loginTime] = useState(Date.now());
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionWarning, setSessionWarning] = useState<{ active: boolean; type: 'inactivity' | 'total'; timeLeft: number }>({ active: false, type: 'total', timeLeft: 120 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom) {
      console.log('[DEBUG] Incoming Room Target Detected:', urlRoom);
    }

    try {
      const session = localStorage.getItem('ghost_session');
      if (session && session !== 'undefined') {
        setCurrentUser(JSON.parse(session));
      } else {
        const guestSession = sessionStorage.getItem('ghost_guest_session');
        if (guestSession && guestSession !== 'undefined') {
          setCurrentUser(JSON.parse(guestSession));
        }
      }
    } catch (err) {
      localStorage.removeItem('ghost_session');
      sessionStorage.removeItem('ghost_guest_session');
    }

    try {
      const savedMeetings = localStorage.getItem('ghost_scheduled_meetings');
      if (savedMeetings) {
        setScheduledMeetings(JSON.parse(savedMeetings));
      }
    } catch (err) {}

    const savedTheme = localStorage.getItem('ghost_theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.className = savedTheme === 'light' ? 'light-mode' : '';
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

  // IMMEDIATE AUTO-JOIN (Definitive fix for "Different Room" issue)
  useEffect(() => {
    if (currentUser && joinRoomId && !isMeetActive) {
      console.log('[DEBUG] Auto-joining active room:', joinRoomId);
      const timer = setTimeout(() => {
        setIsMeetActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, joinRoomId, isMeetActive]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('ghost_theme', newTheme);
    document.body.className = newTheme === 'light' ? 'light-mode' : '';
  };

  const startMeeting = () => {
    const newRoomId = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
    sessionStorage.setItem(`host_privilege_${newRoomId}`, 'true');
    setJoinRoomId(newRoomId);
    setIsHost(true);
    setIsMeetActive(true);
  };

  const joinMeeting = (id: string) => {
    setJoinRoomId(id);
    setIsHost(false);
    setIsMeetActive(true);
    setShowJoinModal(false);
  };

  const closeMeeting = () => {
    setIsMeetActive(false);
    setJoinRoomId(null);
  };

  const [activeMeetings, setActiveMeetings] = useState<any[]>([]);
  useEffect(() => {
    if (isMeetActive || !currentUser || !isCloudBackupActive()) return;
    
    let sub: any = null;
    const fetchMeetings = async () => {
      const { data } = await (supabase as any).from('active_meetings').select('*').order('created_at', { ascending: false });
      if (data) setActiveMeetings(data);
    };

    fetchMeetings();
    sub = (supabase as any).channel('meeting-registry-main').on('postgres_changes', { event: '*', schema: 'public', table: 'active_meetings' }, fetchMeetings).subscribe();

    return () => { if (sub) (supabase as any).removeChannel(sub); };
  }, [isMeetActive, currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('ghost_session');
    sessionStorage.removeItem('ghost_guest_session');
    setCurrentUser(null);
    setIsMeetActive(false);
  };

  const scheduleMeeting = (topic: string, time: string) => {
    const newMeeting = { id: Math.random().toString(36).substring(2, 8).toUpperCase(), topic, time, host: currentUser?.username };
    const updated = [...scheduledMeetings, newMeeting];
    setScheduledMeetings(updated);
    localStorage.setItem('ghost_scheduled_meetings', JSON.stringify(updated));
    setShowScheduleModal(false);
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
            <span className="text-[7px] font-bold text-[var(--subtext)] uppercase tracking-widest mt-0.5">User: {currentUser?.name || 'NODE'}</span>
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
            {currentUser.isAdmin && (
              <button onClick={() => setShowAdminDashboard(true)} className="w-9 h-8 flex items-center justify-center border border-cyan-500/20 rounded-sm bg-cyan-500/5 text-cyan-500 hover:bg-cyan-500/10 transition-all" title="Admin Console">
                <Shield size={14} />
              </button>
            )}
            <button onClick={() => setShowSocialManager(true)} className="w-9 h-8 flex items-center justify-center border border-[var(--border)] rounded-sm bg-[var(--btn-bg)] text-[var(--text)] hover:border-[var(--accent)]/40 transition-all" title="Social Mesh">
              <MessageSquare size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col overflow-hidden bg-[var(--bg)] mesh-grid">
        {!isMeetActive ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-8">
            <Logo size={80} className="mb-8" animate={true} />
            <h1 className="text-4xl md:text-5xl font-light tracking-tighter text-[var(--text)] mb-4 italic chromatic">Secure Communication</h1>
            <p className="text-[10px] font-black text-[var(--subtext)] uppercase tracking-[0.4em] mb-12">Encrypted Video Infrastructure</p>

            {joinRoomId && !isMeetActive && (
              <div className="mb-12 p-6 bg-cyan-500/10 border border-cyan-500/30 animate-pulse text-center">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] block">UPLINK_IN_PROGRESS</span>
                <span className="text-[8px] font-bold text-cyan-500 uppercase tracking-widest mt-2 block italic">Stabilizing connection to room: {joinRoomId}</span>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 w-full max-w-lg mb-12">
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

              <div className="flex-1 bg-black border border-white/10 text-white p-6 flex flex-col justify-between gap-4 group hover:border-cyan-500/40 transition-all duration-500">
                <div className="flex items-center gap-3">
                  <Terminal className="text-zinc-800 group-hover:text-cyan-500 transition-colors" size={24} />
                  <span className="text-[10px] font-black uppercase text-zinc-800 tracking-widest group-hover:text-cyan-900">Join Stable</span>
                </div>
                <input 
                  className="w-full bg-black border border-white/10 py-2 px-3 text-[10px] text-white focus:outline-none focus:border-cyan-500/30 font-mono uppercase"
                  placeholder="ROOM_ID"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') joinMeeting((e.target as HTMLInputElement).value.toUpperCase().trim());
                  }}
                />
              </div>

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
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mt-16">
              <Stat label="MESH_LATENCY" val={nodeStats.latency} />
              <Stat label="ACTIVE_NODES" val={nodeStats.peers.toLocaleString()} />
              <Stat label="UPLINK" val="STABLE" />
              <Stat label="ENCRYPTION" val="AES-256" />
            </div>
          </div>
        ) : (
          <MeetCall onClose={closeMeeting} externalRoomId={joinRoomId} userName={currentUser?.name || 'NODE'} isHost={isHost} />
        )}

        {showSocialManager && (
          <SocialManager 
            currentUser={currentUser} 
            onClose={() => setShowSocialManager(false)} 
            onStartChat={(recipient) => {
              setActiveChatRecipient(recipient);
              setShowSocialManager(false);
            }} 
          />
        )}
        {activeChatRecipient && (
          <DirectChat 
            currentUser={currentUser} 
            recipient={activeChatRecipient} 
            onClose={() => setActiveChatRecipient(null)} 
          />
        )}
        {showScheduleModal && <ScheduleModal onClose={() => setShowScheduleModal(false)} onSchedule={scheduleMeeting} />}
        {showAdminDashboard && <AdminDashboard onClose={() => setShowAdminDashboard(false)} />}
      </main>

      {showJoinModal && <JoinModal onClose={() => setShowJoinModal(false)} onJoin={joinMeeting} />}

      <div className="noise"></div>
      <div className="scanline"></div>
    </div>
  );
};

export default App;
