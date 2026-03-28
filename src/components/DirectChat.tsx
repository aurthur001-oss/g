import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Shield, Terminal, Clock, User } from 'lucide-react';
import { gun } from '../lib/gun';

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
        <div className="fixed bottom-6 right-6 z-[200] w-full max-w-sm h-[500px] bg-black border border-cyan-500/30 flex flex-col shadow-[0_0_50px_rgba(0,229,255,0.1)] animate-in slide-in-from-right-8 duration-500 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-500 animate-pulse" />
            
            <header className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                        <User size={14} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white leading-none">{recipient.username}</h3>
                        <span className="text-[7px] text-cyan-500 uppercase tracking-tighter mt-1 block">ENCRYPTED_SIGNAL_ACTIVE</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-zinc-700 hover:text-white transition-all"><X size={16} /></button>
            </header>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.02)_0%,transparent_100%)]"
            >
                <div className="flex flex-col items-center gap-2 py-4 opacity-20">
                    <Shield size={16} className="text-zinc-500" />
                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-500">Secure Mesh P2P Tunnel Established</span>
                </div>

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === currentUser.username ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-sm text-[10px] font-mono leading-relaxed ${
                            msg.sender === currentUser.username 
                            ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.2)]' 
                            : 'bg-white/[0.03] border border-white/5 text-white'
                        }`}>
                            {msg.text}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[6px] font-black text-zinc-800 uppercase tracking-widest px-1">
                            <Clock size={8} />
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white/[0.01] border-t border-white/5">
                <div className="relative group">
                    <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-cyan-500 transition-colors" size={12} />
                    <input
                        className="w-full bg-black border border-white/10 py-3 pl-10 pr-12 text-[10px] text-white focus:outline-none focus:border-cyan-500/40 uppercase font-mono tracking-widest placeholder:text-zinc-900"
                        placeholder="SEND_ENCRYPTED_SIGNAL..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <button 
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-cyan-500 hover:text-white transition-all"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
};
