import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, Terminal } from 'lucide-react';

interface AdminLoginProps {
    onAuthenticate: (user: { username: string; name: string; isAdmin: boolean }) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onAuthenticate }) => {
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (loginUser === 'ADMIN' && loginPass === 'GHOST_ROOT') {
            const adminUser = { username: 'ADMIN', name: 'SYSTEM_ADMIN', isAdmin: true };
            localStorage.setItem('ghost_session', JSON.stringify(adminUser));
            onAuthenticate(adminUser);
        } else {
            setError('AUTH_FAILED: INVALID_ADMIN_CREDENTIALS');
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-[var(--bg)] flex items-center justify-center p-4 overflow-hidden mesh-grid">
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent opacity-20" />

            <div className="w-full max-w-md relative animate-in fade-in zoom-in-95 duration-700">
                <div className="flex flex-col items-center mb-12">
                    <div className="w-16 h-16 border-2 border-red-500 flex items-center justify-center mb-6 relative group">
                        <Shield className="text-red-500 group-hover:scale-110 transition-transform" size={32} />
                        <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-light uppercase tracking-[0.3em] text-white italic">Infrastructure Console</h2>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span className="text-[10px] font-black text-red-500/80 uppercase tracking-[0.5em]">System Level Access</span>
                    </div>
                </div>

                <div className="bg-[var(--panel)] border border-red-500/20 shadow-2xl p-10 relative">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/40" />

                    <form onSubmit={handleLogin} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Terminal className="text-zinc-700 group-focus-within:text-red-500 transition-colors" size={18} />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full bg-black border border-zinc-800 py-5 pl-12 pr-4 text-white text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-900"
                                    placeholder="Username"
                                    value={loginUser}
                                    onChange={(e) => setLoginUser(e.target.value.toUpperCase())}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="text-zinc-700 group-focus-within:text-red-500 transition-colors" size={18} />
                                </div>
                                <input
                                    type="password"
                                    className="block w-full bg-black border border-zinc-800 py-5 pl-12 pr-4 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-900"
                                    placeholder="••••••••"
                                    value={loginPass}
                                    onChange={(e) => setLoginPass(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-red-600 text-white py-5 px-8 flex items-center justify-center gap-6 group hover:bg-red-500 transition-all relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <span className="text-[12px] font-black uppercase tracking-[0.5em] relative z-10">
                                Admin Login
                            </span>
                            <ArrowRight className="group-hover:translate-x-2 transition-transform relative z-10" size={20} />
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase flex items-center gap-2 justify-center">
                            <Shield size={12} /> {error}
                        </div>
                    )}
                </div>

                <p className="mt-8 text-center text-[7px] font-mono text-zinc-900 uppercase tracking-widest">Unauthorized access will be logged and reported to secondary command.</p>
            </div>

            <div className="noise" />
            <div className="scanline" />
        </div>
    );
};
