import React, { useState } from 'react';
import { User, Lock, ArrowRight, UserPlus, LogIn, X, Terminal } from 'lucide-react';
import { Logo } from './Logo';

interface AuthProps {
    onAuthenticate: (user: { username: string; name: string; isAdmin?: boolean }) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthenticate }) => {
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [regUser, setRegUser] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regName, setRegName] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!loginUser || !loginPass) {
            setError('CREDENTIALS_REQUIRED');
            return;
        }

        const users = JSON.parse(localStorage.getItem('ghost_users') || '[]');
        const user = users.find((u: any) => u.username === loginUser && u.password === loginPass);

        if (user) {
            const sessionUser = { username: user.username, name: user.name, isAdmin: user.isAdmin };
            localStorage.setItem('ghost_session', JSON.stringify(sessionUser));
            onAuthenticate(sessionUser);
        } else {
            setError('AUTH_FAILED: INVALID_CREDENTIALS');
        }
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!regUser || !regPass || !regName) {
            setError('ALL_FIELDS_REQUIRED');
            return;
        }

        const users = JSON.parse(localStorage.getItem('ghost_users') || '[]');
        if (users.find((u: any) => u.username === regUser)) {
            setError('USERNAME_TAKEN');
            return;
        }

        const newUser = { username: regUser, password: regPass, name: regName, isAdmin: false };
        users.push(newUser);
        localStorage.setItem('ghost_users', JSON.stringify(users));

        const sessionUser = { username: newUser.username, name: newUser.name, isAdmin: false };
        localStorage.setItem('ghost_session', JSON.stringify(sessionUser));
        onAuthenticate(sessionUser);
    };

    return (
        <div className="fixed inset-0 z-[300] bg-[var(--bg)] flex items-center justify-center p-4 md:p-12 overflow-hidden mesh-grid">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/5 via-transparent to-transparent opacity-20" />

            <div className="w-full max-w-6xl relative animate-in fade-in zoom-in-95 duration-700 flex flex-col gap-8">
                <div className="flex flex-col items-center mb-4">
                    <Logo size={48} className="mb-4" animate={true} />
                    <h2 className="text-2xl font-light uppercase tracking-tighter text-[var(--text)] italic chromatic">Infrastructure Access</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[9px] font-black text-[var(--subtext)] uppercase tracking-[0.4em]">Node Connection Stable</span>
                    </div>
                </div>

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
                                className="w-full py-4 bg-[var(--accent)] text-black text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-110 transition-all flex items-center justify-center gap-4 group mt-8"
                            >
                                Continue
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    </div>

                    {/* Register Panel */}
                    <div className="bg-[var(--panel)] p-8 md:p-12 relative flex flex-col border-t md:border-t-0 md:border-l border-[var(--border)]">
                        <div className="flex items-center gap-3 mb-8">
                            <UserPlus size={20} className="text-[var(--accent)]" />
                            <h3 className="text-xl font-bold uppercase tracking-widest text-[var(--text)]">Create Account</h3>
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
                                className="w-full py-4 border border-[var(--accent)] text-[var(--accent)] text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[var(--accent)] hover:text-black transition-all flex items-center justify-center gap-4 group mt-8"
                            >
                                Register
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/5 border border-red-500/20 text-red-500 text-[9px] font-black uppercase flex items-center gap-3 animate-shake justify-center">
                        <X size={14} /> {error}
                    </div>
                )}

                <div className="flex justify-end items-center px-2">
                    <p className="text-[8px] font-mono text-zinc-900 uppercase tracking-[0.2em] hidden md:block text-right">© 2026 GHOST ANALYTICS // MISSION CRITICAL SYSTEMS</p>
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
            `}} />
            <div className="noise" />
            <div className="scanline" />
        </div>
    );
};
