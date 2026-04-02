import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Shield, Terminal, Clock, User, Check } from 'lucide-react';
import { gun } from '../lib/gun';

const getAvatarColor = (name: string) => {
    const hues = [210, 260, 280, 20, 140, 180, 330]; 
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hues[Math.abs(hash) % hues.length]}, 65%, 55%)`;
};

interface DirectChatProps {
    currentUser: { username: string; name: string };
    recipient: { username: string; name: string };
    onClose: () => void;
}

interface Message {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
}

export const DirectChat: React.FC<DirectChatProps> = ({ currentUser, recipient, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Create a unique chat ID based on both usernames (sorted alphabetically)
    const chatID = [currentUser.username, recipient.username].sort().join('_');

    useEffect(() => {
        const chatRef = gun.get('ghosts_chats_v1').get(chatID).get('messages');
        
        chatRef.map().on((data, id) => {
            if (data && data.text) {
                setMessages(prev => {
                    if (prev.find(m => m.id === id)) return prev;
                    const newMsg = {
                        id,
                        sender: data.sender,
                        text: data.text,
                        timestamp: data.timestamp
                    };
                    return [...prev, newMsg].sort((a, b) => a.timestamp - b.timestamp);
                });
            }
        });

        return () => chatRef.off();
    }, [chatID]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim()) return;

        const chatRef = gun.get('ghosts_chats_v1').get(chatID).get('messages');
        const msgID = Math.random().toString(36).substring(2, 15);
        
        chatRef.get(msgID).put({
            sender: currentUser.username,
            text: inputText.trim(),
            timestamp: Date.now()
        });

        setInputText('');
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200] w-full max-w-[360px] h-[580px] bg-black/80 backdrop-blur-3xl border border-white/10 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-8 duration-500 overflow-hidden rounded-3xl">
            <header className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg" style={{ backgroundColor: getAvatarColor(recipient.username) }}>
                        <span className="text-sm font-black">{recipient.username[0]}</span>
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-white leading-none">{recipient.username}</h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                            <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-black">ENCRYPTED_SIGNAL_STABLE</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all"><X size={18} /></button>
            </header>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar bg-gradient-to-b from-transparent to-black/20"
            >
                <div className="flex flex-col items-center gap-3 py-6 opacity-30">
                    <Shield size={20} className="text-cyan-500/50" />
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 text-center px-8 leading-relaxed">Secure Mesh P2P Tunnel Established • End-to-End Encrypted</span>
                </div>

                {messages.map((msg) => {
                    const isSelf = msg.sender === currentUser.username;
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!isSelf && (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/5 shadow-lg" style={{ backgroundColor: getAvatarColor(msg.sender) }}>
                                    <span className="text-[10px] font-black text-white">{msg.sender[0]}</span>
                                </div>
                            )}
                            <div className={`relative group max-w-[80%] px-4 py-2.5 rounded-2xl shadow-xl border ${isSelf ? 'bg-gradient-to-br from-cyan-600 to-cyan-800 border-cyan-500/30 text-white rounded-br-none' : 'bg-zinc-900/90 border-white/5 text-zinc-300 rounded-bl-none'}`}>
                                <div className="text-[11px] leading-relaxed font-medium break-words">{msg.text}</div>
                                <div className="flex items-center justify-end gap-1 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[6px] font-mono uppercase tracking-widest">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                    {isSelf && <Check size={8} className="text-white/60" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {['🐱', '🐶', '🐈', '🐕', '🐾', '🥨', '🌈', '✨', '💖'].map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => setInputText(prev => prev + emoji)}
                            className="text-lg hover:scale-125 transition-transform p-1.5 bg-white/5 rounded-lg hover:bg-white/10"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl px-1 py-1 focus-within:border-cyan-500/50 transition-all">
                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-white transition-all hover:bg-white/5">🐶</button>
                    <input
                        className="flex-1 bg-transparent py-2.5 px-2 text-[11px] text-white focus:outline-none placeholder:text-zinc-800 font-medium"
                        placeholder="Say something cute... 🐾"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <button 
                        type="submit"
                        disabled={!inputText.trim()}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${inputText.trim() ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]' : 'text-zinc-800'}`}
                    >
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
};
