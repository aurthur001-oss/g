import React, { useState, useEffect } from 'react';
import { Shield, Activity, Users, Clock, ChartBar, Settings, X, Search, Terminal, Share2, Map as MapIcon, Globe, Cloud } from 'lucide-react';
import { LoggingService, type SystemLog } from '../services/LoggingService';
import { meshNodes, meshEvents } from '../lib/gun';
import { supabase, isCloudBackupActive } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';

interface AdminDashboardProps {
    onClose: () => void;
}

interface InteractionNode {
    user: string;
    connected_with: string[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [interactions, setInteractions] = useState<InteractionNode[]>([]);
    const [stats, setStats] = useState({
        activeMeetings: 0,
        totalMeetingsToday: 0,
        avgDuration: '24m',
        bandwidth: '0.0 GB',
        totalUsers: 0
    });
    const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);

    const fetchUsers = async () => {
        // 1. Initial load from LocalStorage (fastest)
        const localUsers = JSON.parse(localStorage.getItem('ghost_users') || '[]');
        setRegisteredUsers(localUsers);

        // 2. Load from Supabase (Persistent Backup)
        if (isCloudBackupActive()) {
            const { data } = await (supabase as any)
                .from('nodes')
                .select('*')
                .order('timestamp', { ascending: false });

            if (data) {
                // Merge with local filtering duplicates
                setRegisteredUsers(prev => {
                    const combined = [...prev, ...data];
                    return Array.from(new Map(combined.map(u => [u.username, u])).values());
                });
            }
        }
    };

    const deleteUser = async (username: string) => {
        if (confirm(`Are you sure you want to decommission node ${username}?`)) {
            // 1. Remove from Mesh
            meshNodes.get(username).put(null);

            // 2. Remove from Supabase
            if (isCloudBackupActive()) {
                await (supabase as any).from('nodes').delete().eq('username', username);
            }

            // 3. Remove from LocalStorage
            const users = JSON.parse(localStorage.getItem('ghost_users') || '[]');
            const updated = users.filter((u: any) => u.username !== username);
            localStorage.setItem('ghost_users', JSON.stringify(updated));

            // 4. Notify Admin
            await NotificationService.notifyAdmin(
                'Node Decommissioned',
                `Node ${username} has been forcefully decommissioned from the global mesh.`
            );

            setRegisteredUsers(prev => prev.filter(u => u.username !== username));
        }
    };

    useEffect(() => {
        const rawLogs = LoggingService.getLogs();
        setLogs(rawLogs);
        setInteractions(LoggingService.getInteractionMap());
        fetchUsers();

        // 3. Listen to Mesh (GunDB) for real-time global updates
        const meshListener = meshNodes.map().on((data: any, key: string) => {
            if (data && data.username) {
                setRegisteredUsers(prev => {
                    const exists = prev.find(u => u.username === data.username);
                    if (exists && exists.timestamp >= data.timestamp) return prev;

                    const updated = [...prev.filter(u => u.username !== data.username), data];
                    return updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                });
            } else if (data === null) {
                // Handle deletion broadcast
                setRegisteredUsers(prev => prev.filter(u => u.username !== key));
            }
        });

        // 4. Listen to Mesh (GunDB) for real-time system logs
        const logListener = meshEvents.map().on((data: any) => {
            if (data && data.event) {
                setLogs(prev => {
                    if (prev.find(l => l.timestamp === data.timestamp && l.event === data.event)) return prev;
                    const updated = [...prev, data];
                    return updated.sort((a, b) => b.timestamp - a.timestamp);
                });
            }
        });

        // Simulate some stats based on logs
        const active = rawLogs.filter((l: SystemLog) => l.event === 'meeting_created').length -
            rawLogs.filter((l: SystemLog) => l.event === 'meeting_ended').length;

        setStats(prev => ({
            ...prev,
            activeMeetings: Math.max(0, active),
            totalMeetingsToday: rawLogs.filter((l: SystemLog) => l.event === 'meeting_created').length,
            avgDuration: '24m',
            bandwidth: (Math.random() * 10).toFixed(1) + ' GB'
        }));

        return () => {
            if (meshListener && typeof meshListener.off === 'function') meshListener.off();
            if (logListener && typeof logListener.off === 'function') logListener.off();
        };
    }, []);

    useEffect(() => {
        setStats(prev => ({ ...prev, totalUsers: registeredUsers.length }));
    }, [registeredUsers]);

    return (
        <div className="fixed inset-0 z-[250] bg-[var(--bg)]/90 backdrop-blur-3xl flex items-center justify-center p-6">
            <div className="w-full max-w-5xl bg-[var(--panel)] border border-[var(--border)] flex flex-col h-[800px] shadow-2xl overflow-hidden relative font-sans">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent)]/0 via-[var(--accent)]/40 to-[var(--accent)]/0" />

                <header className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center rounded-sm">
                            <Shield className="text-cyan-500" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-light uppercase tracking-tight text-white italic">Management Console</h3>
                            <p className="text-[8px] font-black text-zinc-800 uppercase tracking-[0.5em] mt-1 ml-[0.5em]">System Administration & Monitoring</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/5 border border-green-500/20 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">System Online</span>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center text-zinc-700 hover:text-white transition-all"><X size={24} /></button>
                    </div>
                </header>

                <div className="p-8 grid grid-cols-1 md:grid-cols-5 gap-6 bg-white/[0.01] border-b border-white/5">
                    <StatCard icon={<Activity size={18} />} label="Active Meetings" value={stats.activeMeetings} />
                    <StatCard icon={<Users size={18} />} label="Total Meetings" value={stats.totalMeetingsToday} />
                    <StatCard icon={<Clock size={18} />} label="Avg Duration" value={stats.avgDuration} />
                    <StatCard icon={<ChartBar size={18} />} label="Data Usage" value={stats.bandwidth} />
                    <StatCard icon={<Shield size={18} />} label="Initialized Nodes" value={stats.totalUsers} />
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Terminal size={14} className="text-zinc-700" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">System Event Logs</h4>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-800" size={12} />
                            <input
                                placeholder="FILTER_LOGS..."
                                className="bg-black border border-white/5 py-2 pl-10 pr-4 text-[9px] text-zinc-400 focus:outline-none focus:border-cyan-500/20 w-64 uppercase tracking-widest font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
                        <div className="border border-white/5 bg-black flex flex-col">
                            <div className="bg-white/5 px-6 py-3 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest">System Event Logs</span>
                                <Terminal size={14} className="text-zinc-700" />
                            </div>
                            <div className="max-h-[350px] overflow-y-auto no-scrollbar flex-1">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[8px] font-black uppercase text-zinc-700">
                                            <th className="px-6 py-4">Time</th>
                                            <th className="px-6 py-4">Event</th>
                                            <th className="px-6 py-4">Metadata</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[10px] font-mono text-zinc-400">
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-20 text-center opacity-20 italic">No system telemetry recorded</td>
                                            </tr>
                                        ) : (
                                            logs.slice().reverse().map((log: SystemLog, i: number) => (
                                                <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all group">
                                                    <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                                    <td className="px-6 py-4 font-bold text-white tracking-widest">{log.event.toUpperCase().replace('_', ' ')}</td>
                                                    <td className="px-6 py-4 text-[8px] max-w-xs truncate text-zinc-600 group-hover:text-zinc-400">{JSON.stringify(log.data)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="border border-white/5 bg-black flex flex-col">
                            <div className="bg-white/5 px-6 py-3 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest">User Node Management</span>
                                <Shield size={14} className="text-zinc-700" />
                            </div>
                            <div className="max-h-[350px] overflow-y-auto no-scrollbar flex-1">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[8px] font-black uppercase text-zinc-700">
                                            <th className="px-6 py-4">Node_ID</th>
                                            <th className="px-6 py-4">Display_Name</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[10px] font-mono text-zinc-400">
                                        {registeredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-20 text-center opacity-20 italic">No active nodes detected</td>
                                            </tr>
                                        ) : (
                                            registeredUsers.map((user, i) => (
                                                <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all group">
                                                    <td className="px-6 py-4 font-bold text-cyan-500 uppercase flex items-center gap-2">
                                                        {user.username}
                                                        {user.isAdmin && <Shield size={8} className="text-amber-500" />}
                                                    </td>
                                                    <td className="px-6 py-4 text-zinc-400">{user.name}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                                                            <div title="Mesh Discovery Active"><Globe size={10} className="text-zinc-700" /></div>
                                                            {isCloudBackupActive() && (
                                                                <div title="Cloud Backup Synced"><Cloud size={10} className="text-green-900" /></div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => deleteUser(user.username)}
                                                            className="text-red-900 hover:text-red-500 transition-colors uppercase font-black text-[8px] tracking-widest"
                                                        >
                                                            Decommission
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="border border-white/5 bg-black flex flex-col">
                            <div className="bg-white/5 px-6 py-3 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest">User Interaction Map</span>
                                <MapIcon size={14} className="text-zinc-700" />
                            </div>
                            <div className="p-8 max-h-[350px] overflow-y-auto no-scrollbar flex-1">
                                {interactions.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-zinc-800 text-[10px] uppercase font-black">No intersection data detected</div>
                                ) : (
                                    <div className="space-y-6">
                                        {interactions.map((node, idx) => (
                                            <div key={idx} className="flex gap-4 items-start">
                                                <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-sm">
                                                    <span className="text-[10px] font-black text-cyan-500 uppercase">{node.user}</span>
                                                </div>
                                                <div className="flex-1 mt-2.5 h-px bg-white/5 relative">
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cyan-500/40" />
                                                </div>
                                                <div className="flex flex-wrap gap-2 w-1/2">
                                                    {node.connected_with.map((peer: string, pIdx: number) => (
                                                        <div key={pIdx} className="bg-[var(--btn-bg)] border border-[var(--border)] px-2 py-1 flex items-center gap-2">
                                                            <Share2 size={8} className="text-[var(--subtext)]" />
                                                            <span className="text-[8px] font-bold text-[var(--subtext)]">{peer}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-800 uppercase tracking-widest">
                            <Settings size={14} className="animate-spin-slow" />
                            System Configuration: Standardized
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-900 uppercase">
                        Build Hash: {Math.random().toString(36).substring(7).toUpperCase()}
                    </div>
                </footer>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="p-6 border border-[var(--border)] bg-[var(--btn-bg)] hover:bg-[var(--accent)]/5 transition-all group">
        <div className="mb-4 text-[var(--subtext)] group-hover:text-[var(--accent)] transition-colors">{icon}</div>
        <div className="text-[8px] font-black uppercase text-[var(--subtext)] tracking-widest mb-1">{label}</div>
        <div className="text-2xl font-light italic text-[var(--text)] tracking-tighter">{value}</div>
    </div>
);
