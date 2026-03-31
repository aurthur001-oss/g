import React, { useState, useEffect } from 'react';
import { UserPlus, User, MessageSquare, Trash2, X, Search, Activity, ShieldAlert, Check, Zap, Target, Globe } from 'lucide-react';
import { meshNodes, gun } from '../lib/gun';

const getAvatarColor = (name: string) => {
    const hues = [210, 260, 280, 20, 140, 180, 330]; 
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hues[Math.abs(hash) % hues.length]}, 65%, 55%)`;
};

interface SocialManagerProps {
    currentUser: { username: string; name: string; isAdmin?: boolean };
    onClose: () => void;
    onStartChat: (friend: { username: string; name: string }) => void;
}

export const SocialManager: React.FC<SocialManagerProps> = ({ currentUser, onClose, onStartChat }) => {
    const [friends, setFriends] = useState<{ username: string; name: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<{ username: string; name: string } | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const isGuest = currentUser.username.startsWith('GUEST_');

    useEffect(() => {
        if (isGuest) return;

        // Load friends from GunDB
        const friendsRef = meshNodes.get(currentUser.username).get('friends');
        friendsRef.map().on((data, key) => {
            if (data) {
                setFriends(prev => {
                    const exists = prev.find(f => f.username === data.username);
                    if (exists) return prev;
                    return [...prev, { username: data.username, name: data.name }];
                });
            }
        });

        return () => friendsRef.off();
    }, [currentUser.username, isGuest]);

    const handleSearch = () => {
        if (!searchQuery || isGuest) return;
        setIsSearching(true);
        setSearchResult(null);
        setStatusMsg('');

        // Query the mesh for a node with this username
        meshNodes.get(searchQuery.toUpperCase()).once((data) => {
            setIsSearching(false);
            if (data && data.username) {
                setSearchResult({ username: data.username, name: data.name });
            } else {
                setStatusMsg('NODE_NOT_FOUND_IN_MESH');
            }
        });
    };

    const addFriend = () => {
        if (!searchResult) return;
        
        const friendsRef = meshNodes.get(currentUser.username).get('friends');
        friendsRef.get(searchResult.username).put({
            username: searchResult.username,
            name: searchResult.name,
            timestamp: Date.now()
        });
        
        setSearchResult(null);
        setSearchQuery('');
        setStatusMsg('FRIEND_ADDED_TO_MESH');
        setTimeout(() => setStatusMsg(''), 2000);
    };

    const removeFriend = (username: string) => {
        meshNodes.get(currentUser.username).get('friends').get(username).put(null);
        setFriends(prev => prev.filter(f => f.username !== username));
    };

    if (isGuest) {
        return (
            <div className="fixed inset-0 z-[180] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-black border border-red-500/20 p-12 text-center animate-in zoom-in-95 duration-500">
                    <ShieldAlert size={48} className="text-red-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-light uppercase tracking-tight text-white mb-4 italic">Clearance Required</h3>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-relaxed mb-8">
                        Social Mesh features are restricted to Registered Nodes only. Please create a permanent account to access encrypted chat and friend discovery.
                    </p>
                    <button onClick={onClose} className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 transition-all">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[180] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-black border border-white/10 flex flex-col h-[600px] shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0" />

                <header className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center rounded-sm shadow-[0_0_20px_rgba(0,229,255,0.1)]">
                            <Zap className="text-cyan-500 animate-pulse" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-light uppercase tracking-tight text-white italic">Contacts</h3>
                            <p className="text-[8px] font-black text-cyan-900 uppercase tracking-[0.3em] mt-1">Logged in as: {currentUser.username}</p>
                        </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-zinc-700 hover:text-white transition-all"><X size={20} /></button>
                </header>

                <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-800" size={14} />
                            <input
                                className="w-full bg-[#050505] border border-white/5 py-3 pl-12 pr-4 text-[10px] text-white focus:outline-none focus:border-cyan-500/30 uppercase tracking-widest font-mono"
                                placeholder="SEARCH_BY_USERNAME..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button 
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="px-6 bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all disabled:opacity-50"
                        >
                            {isSearching ? 'SEARCHING...' : 'SEARCH'}
                        </button>
                    </div>

                    {searchResult && (
                     <div className="mt-4 p-5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-500 shadow-xl group/result relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg border border-white/10" style={{ backgroundColor: getAvatarColor(searchResult.username) }}>
                                <span className="text-sm font-black">{searchResult.username[0]}</span>
                            </div>
                            <div>
                                <span className="block text-[13px] font-black text-white tracking-widest">{searchResult.username}</span>
                                <span className="block text-[8px] text-cyan-500 uppercase font-black">{searchResult.name}</span>
                            </div>
                        </div>
                        <button onClick={addFriend} className="px-6 py-2.5 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all rounded-full shadow-lg">
                            Add Contact
                        </button>
                    </div>
                )}

                    {statusMsg && (
                        <div className="mt-4 text-center text-[8px] font-black text-zinc-800 uppercase tracking-[0.3em] italic animate-pulse">
                            {statusMsg}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
                    {friends.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                            <Activity size={48} className="text-zinc-500 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Mesh Connection Empty</p>
                            <p className="text-[8px] font-bold text-zinc-800 uppercase tracking-widest mt-2 italic">Search for nodes to build your network</p>
                        </div>
                    ) : (
                        friends.map(friend => (
                            <div key={friend.username} className="p-4 bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 transition-all flex items-center justify-between group rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white border border-white/5 shadow-lg transition-transform group-hover:scale-105" style={{ backgroundColor: getAvatarColor(friend.username) }}>
                                        <span className="text-sm font-black">{friend.username[0]}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-black uppercase text-white tracking-widest">{friend.username}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        </div>
                                        <span className="text-[8px] font-mono text-zinc-600 uppercase mt-0.5 tracking-tight">{friend.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onStartChat(friend)}
                                        className="h-10 px-5 flex items-center justify-center gap-3 bg-zinc-900 border border-white/5 text-cyan-500 rounded-full hover:bg-cyan-500 hover:text-black transition-all group/btn"
                                        title="Instant Message"
                                    >
                                        <MessageSquare size={16} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Chat</span>
                                    </button>
                                    <button
                                        onClick={() => removeFriend(friend.username)}
                                        className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-red-500 transition-all"
                                        title="Remove Friend"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 text-center bg-white/[0.01] border-t border-white/5">
                    <p className="text-[7px] font-black text-zinc-900 uppercase tracking-[0.4em]">Decentralized Mesh Social Layer • Mission Critical Encryption</p>
                </div>
            </div>
        </div>
    );
};
