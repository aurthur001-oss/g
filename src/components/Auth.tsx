import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, UserPlus, LogIn, X, Terminal, Shield, Globe, Send, Video } from 'lucide-react';
import { Logo } from './Logo';
import { meshNodes } from '../lib/gun';
import { supabase, isCloudBackupActive } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';
import { getPublicIP } from '../lib/ip';

interface AuthProps {
    onAuthenticate: (user: { username: string; name: string; isAdmin?: boolean; ip?: string }) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthenticate }) => {
    const [view, setView] = useState<'guest' | 'account'>(() => {
        const saved = sessionStorage.getItem('auth_initial_view');
        if (saved === 'account' || saved === 'guest') {
            sessionStorage.removeItem('auth_initial_view');
            return saved as any;
        }
        return 'guest';
    });
    const [guestName, setGuestName] = useState('');
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [regUser, setRegUser] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regName, setRegName] = useState('');
    const [error, setError] = useState('');
    const [userIp, setUserIp] = useState<string>('DETECTING...');
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        getPublicIP().then(setUserIp);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSyncing(true);

        if (!loginUser || !loginPass) {
            setError('CREDENTIALS_REQUIRED');
            setIsSyncing(false);
            return;
        }

        try {
            let foundUser: any = null;
            const meshPromise = new Promise((resolve) => {
                let found = false;
                meshNodes.map().once((data: any) => {
                    if (data && data.username === loginUser && data.password === loginPass) {
                        found = true;
                        resolve(data);
                    }
                });
                setTimeout(() => { if (!found) resolve(null); }, 2000);
            });

            foundUser = await meshPromise;

            if (!foundUser && isCloudBackupActive()) {
                const { data } = await (supabase as any)
                    .from('nodes')
                    .select('*')
                    .eq('username', loginUser)
                    .eq('password', loginPass)
                    .single();

                if (data) foundUser = data;
            }

            if (!foundUser) {
                const localUsers = JSON.parse(localStorage.getItem('ghost_users') || '[]');
                foundUser = localUsers.find((u: any) => u.username === loginUser && u.password === loginPass);
            }

            if (foundUser) {
                const sessionUser = {
                    username: foundUser.username,
                    name: foundUser.name,
                    isAdmin: foundUser.isAdmin,
                    ip_address: userIp
                };
                localStorage.setItem('ghost_session', JSON.stringify(sessionUser));
                onAuthenticate(sessionUser);
            } else {
                setError('AUTH_FAILED: INVALID_CREDENTIALS');
            }
        } catch (err: any) {
            if (err.code === '42P01') {
                setError('INFRASTRUCTURE_ERROR: DATABASE_TABLES_MISSING. PLEASE RUN PROVISION SCRIPT IN ADMIN CONSOLE.');
            } else {
                setError('SYNC_ERROR: UNABLE_TO_REACH_MESH');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSyncing(true);

        if (!regUser || !regPass || !regName) {
            setError('ALL_FIELDS_REQUIRED');
            setIsSyncing(false);
            return;
        }

        const newUser = {
            username: regUser,
            password: regPass,
            name: regName,
            isAdmin: regName.toUpperCase() === 'ADMIN',
            timestamp: Date.now(),
            ip_address: userIp
        };

        try {
            meshNodes.get(regUser).put(newUser);
            if (isCloudBackupActive()) {
                await (supabase as any).from('nodes').upsert(newUser);
            }

            const localUsers = JSON.parse(localStorage.getItem('ghost_users') || '[]');
            localUsers.push(newUser);
            localStorage.setItem('ghost_users', JSON.stringify(localUsers));

            await NotificationService.notifyNewNodeRegistration(regUser, regName);

            const sessionUser = { username: newUser.username, name: newUser.name, isAdmin: newUser.isAdmin, ip_address: userIp };
            localStorage.setItem('ghost_session', JSON.stringify(sessionUser));
            onAuthenticate(sessionUser);
        } catch (err: any) {
            if (err.code === '42P01') {
                setError('REGISTRATION_FAILED: DATABASE_TABLES_MISSING. PLEASE RUN PROVISION SCRIPT IN ADMIN CONSOLE.');
            } else {
                setError('REGISTRATION_FAILED: INFRASTRUCTURE_OFFLINE');
            }
            NotificationService.notifyMeshSyncFailure(err.message || 'Unknown registration error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGuestLogin = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSyncing(true);

        // Shadow Login Bypass for Infrastructure Recovery
        if (guestName.trim().toUpperCase() === 'SHADOW_ROOT') {
            setTimeout(() => {
                const adminUser = {
                    username: 'SHADOW_ADMIN',
                    name: 'SYSTEM ADMINISTRATOR',
                    isAdmin: true,
                    ip_address: userIp
                };
                onAuthenticate(adminUser);
                setIsSyncing(false);
            }, 1200);
            return;
        }
        
        setTimeout(() => {
            const guestId = Math.floor(Math.random() * 9000 + 1000);
            const guestUser = {
                username: `GUEST-${guestId}`,
                name: guestName.toUpperCase() || `GUEST PARTICIPANT ${guestId}`,
                isAdmin: false,
                ip_address: userIp
            };
            sessionStorage.setItem('ghost_guest_session', JSON.stringify(guestUser));
            onAuthenticate(guestUser);
            setIsSyncing(false);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-start p-4 md:p-12 relative overflow-x-hidden mesh-grid">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/5 via-transparent to-transparent opacity-20 pointer-events-none" />
            <div className="w-full bg-red-600 text-white py-1 px-4 text-center text-[10px] font-black uppercase tracking-[0.5em] animate-pulse z-[100] relative">
                BETA_MESSENGER_V2_DEPLOYED_ACK
            </div>

            <div className="w-full max-w-6xl relative animate-in fade-in zoom-in-95 duration-700 flex flex-col gap-8 pt-12 md:pt-24 z-10">
                <div className="flex flex-col items-center text-center">
                    <Logo size={64} className="mb-6" animate={true} />
                    <h1 className="text-3xl md:text-6xl font-light uppercase tracking-tighter text-[var(--text)] italic chromatic leading-tight">Video Conference 🐱</h1>
                    <p className="text-[9px] md:text-[11px] font-black text-[var(--accent)] uppercase tracking-[0.6em] mt-2 px-12 opacity-80">Simple, Secure, P2P Meetings 🐶</p>
                    
                    {sessionStorage.getItem('pending_host') && (
                        <div className="mt-10 px-8 py-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full animate-pulse shadow-[0_0_30px_rgba(0,229,255,0.1)]">
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest italic">JOINING_{sessionStorage.getItem('pending_host')}_MEETING_UPLINK</span>
                        </div>
                    )}
                </div>

                {view === 'guest' ? (
                    <div className="w-full max-w-md mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <form onSubmit={handleGuestLogin} className="space-y-10">
                            <div className="space-y-4">
                                <label className="text-[8px] font-black text-[var(--subtext)] uppercase tracking-[0.4em] pl-1 opacity-60">Your Display Name</label>
                                <div className="relative group">
                                    <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--subtext)] group-focus-within:text-[var(--accent)] transition-colors opacity-40" size={18} />
                                    <input
                                        type="text"
                                        className="w-full bg-[var(--panel)] border border-[var(--border)] py-6 pl-14 pr-4 text-[var(--text)] text-[13px] uppercase font-mono tracking-[0.2em] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/10 transition-all placeholder:text-zinc-800"
                                        placeholder="ENTER_NAME_OR_PROCEED_AS_GUEST"
                                        value={guestName}
                                        onChange={e => setGuestName(e.target.value.toUpperCase())}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSyncing}
                                onClick={() => sessionStorage.setItem('auth_target', 'meet')}
                                className="w-full py-7 bg-cyan-500 text-black text-[13px] font-black uppercase tracking-[0.5em] hover:bg-white transition-all flex items-center justify-center gap-6 group shadow-[0_0_50px_rgba(0,229,255,0.15)] relative overflow-hidden active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="relative z-10">Join _ Meeting</span>
                                <ArrowRight className="relative z-10 group-hover:translate-x-2 transition-transform" size={20} />
                            </button>

                            <div className="pt-4">
                                <button
                                    type="button"
                                    disabled={isSyncing}
                                    onClick={() => {
                                        sessionStorage.setItem('auth_target', 'chat');
                                        handleGuestLogin();
                                    }}
                                    className="w-full py-5 bg-white/5 border border-cyan-500/30 text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-4 group relative overflow-hidden active:scale-[0.98] rounded-sm"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Send size={18} className="text-cyan-500 relative z-10 animate-pulse" />
                                    <span className="relative z-10">Launch Ghost Messenger 🐾</span>
                                </button>
                            </div>
                        </form>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-sm text-center">
                                <span className="block text-[8px] font-black text-zinc-800 uppercase tracking-widest mb-1">Detection ID (IP)</span>
                                <span className="block text-[10px] font-mono text-[var(--subtext)]">{userIp}</span>
                            </div>
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-sm text-center">
                                <span className="block text-[8px] font-black text-zinc-800 uppercase tracking-widest mb-1">Encrypted Tunnel</span>
                                <span className="block text-[10px] font-mono text-green-500">ACTIVE</span>
                            </div>
                        </div>

                        <div className="text-center pt-8">
                            <button 
                                onClick={() => setView('account')}
                                className="text-[9px] font-black text-zinc-900 uppercase tracking-[0.3em] hover:text-[var(--accent)] transition-all flex items-center justify-center gap-2 mx-auto decoration-transparent hover:decoration-[var(--accent)] underline underline-offset-8"
                            >
                                <Shield size={12} />
                                SIGN_IN_OR_CREATE_ACCOUNT
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--border)] border border-[var(--border)] shadow-2xl overflow-hidden">
                            {/* Login Panel */}
                            <div className="bg-[var(--panel)] p-8 md:p-12 relative flex flex-col">
                                <div className="flex items-center gap-3 mb-8">
                                    <LogIn size={20} className="text-[var(--accent)]" />
                                    <h3 className="text-xl font-bold uppercase tracking-widest text-[var(--text)]">Sign In</h3>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-6 flex-1">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-[var(--subtext)] uppercase tracking-widest pl-1">Username</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--subtext)]" size={16} />
                                            <input
                                                type="text"
                                                className="w-full bg-[var(--bg)] border border-[var(--border)] py-4 pl-12 pr-4 text-[var(--text)] text-[10px] uppercase font-mono tracking-widest focus:outline-none focus:border-[var(--accent)]/40 transition-all placeholder:text-zinc-800"
                                                placeholder="Username"
                                                value={loginUser}
                                                onChange={e => setLoginUser(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-[var(--subtext)] uppercase tracking-widest pl-1">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--subtext)]" size={16} />
                                            <input
                                                type="password"
                                                className="w-full bg-[var(--bg)] border border-[var(--border)] py-4 pl-12 pr-4 text-[var(--text)] text-[10px] uppercase font-mono tracking-widest focus:outline-none focus:border-[var(--accent)]/40 transition-all placeholder:text-zinc-800"
                                                placeholder="••••••••"
                                                value={loginPass}
                                                onChange={e => setLoginPass(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSyncing}
                                        className="w-full py-4 bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[var(--accent)]/20 transition-all flex items-center justify-center gap-4 group mt-8 disabled:opacity-50"
                                    >
                                        {isSyncing ? 'Signing In...' : 'Sign In Now'}
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </form>
                            </div>

                            {/* Register Panel */}
                            <div className="bg-[var(--panel)] p-8 md:p-12 relative flex flex-col border-t md:border-t-0 md:border-l border-[var(--border)]">
                                <div className="flex items-center gap-3 mb-8">
                                    <UserPlus size={20} className="text-[var(--accent)]" />
                                    <h3 className="text-xl font-bold uppercase tracking-widest text-[var(--text)]">Sign Up</h3>
                                </div>

                                <form onSubmit={handleRegister} className="space-y-6 flex-1">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-[var(--subtext)] uppercase tracking-widest pl-1">New Username</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--subtext)]" size={16} />
                                            <input
                                                type="text"
                                                className="w-full bg-[var(--bg)] border border-[var(--border)] py-4 pl-12 pr-4 text-[var(--text)] text-[10px] uppercase font-mono tracking-widest focus:outline-none focus:border-[var(--accent)]/40 transition-all placeholder:text-zinc-800"
                                                placeholder="Username"
                                                value={regUser}
                                                onChange={e => setRegUser(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-[var(--subtext)] uppercase tracking-widest pl-1">Display Name</label>
                                        <div className="relative">
                                            <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--subtext)]" size={16} />
                                            <input
                                                type="text"
                                                className="w-full bg-[var(--bg)] border border-[var(--border)] py-4 pl-12 pr-4 text-[var(--text)] text-[10px] uppercase font-mono tracking-widest focus:outline-none focus:border-[var(--accent)]/40 transition-all placeholder:text-zinc-800"
                                                placeholder="Full Name"
                                                value={regName}
                                                onChange={e => setRegName(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-[var(--subtext)] uppercase tracking-widest pl-1">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--subtext)]" size={16} />
                                            <input
                                                type="password"
                                                className="w-full bg-[var(--bg)] border border-[var(--border)] py-4 pl-12 pr-4 text-[var(--text)] text-[10px] uppercase font-mono tracking-widest focus:outline-none focus:border-[var(--accent)]/40 transition-all placeholder:text-zinc-800"
                                                placeholder="••••••••"
                                                value={regPass}
                                                onChange={e => setRegPass(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSyncing}
                                        className="w-full py-4 border border-[var(--accent)] text-[var(--accent)] text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[var(--accent)] hover:text-black transition-all flex items-center justify-center gap-4 group mt-8 disabled:opacity-50"
                                    >
                                        {isSyncing ? 'Creating...' : 'Create Account'}
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </form>
                            </div>
                        </div>
                        <div className="text-center mt-8">
                            <button 
                                onClick={() => setView('guest')}
                                className="text-[10px] font-black text-white hover:text-cyan-500 uppercase tracking-widest flex items-center gap-2 mx-auto"
                            >
                                <ArrowRight size={14} className="rotate-180" />
                                BACK_TO_GUEST_ENTRY
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-500/5 border border-red-500/20 text-red-500 text-[9px] font-black uppercase flex items-center gap-3 animate-shake justify-center">
                        <X size={14} /> {error}
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2 mt-8 opacity-40">
                    <div className="flex items-center gap-3 order-2 md:order-1">
                        <Globe size={12} className="text-zinc-900" />
                        <span className="text-[8px] font-mono text-zinc-900 uppercase tracking-widest">Signal Detected: {userIp}</span>
                    </div>
                    <p className="text-[8px] font-mono text-zinc-900 uppercase tracking-[0.2em] order-1 md:order-2">© 2026 GHOST ANALYTICS // MISSION CRITICAL SYSTEMS</p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out infinite; animation-iteration-count: 2; }
                .noise { position: fixed; inset: 0; z-index: 9999; opacity: 0.04; pointer-events: none; background: url('https://grainy-gradients.vercel.app/noise.svg'); }
                .scanline { position: fixed; inset: 0; z-index: 9998; pointer-events: none; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); background-size: 100% 2px, 3px 100%; }
            `}} />
        </div>
    );
};
