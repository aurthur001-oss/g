import React, { useState, useEffect } from 'react';
import { UserPlus, User, Phone, Trash2, X, Search, Activity } from 'lucide-react';

export interface GhostContact {
    id: string;
    codename: string;
    peerId: string;
    lastActive?: number;
    notes?: string;
}

interface ContactManagerProps {
    onClose: () => void;
    onCall: (peerId: string) => void;
}

export const ContactManager: React.FC<ContactManagerProps> = ({ onClose, onCall }) => {
    const [contacts, setContacts] = useState<GhostContact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newContact, setNewContact] = useState({ codename: '', peerId: '', notes: '' });

    useEffect(() => {
        const saved = localStorage.getItem('ghost_contacts');
        if (saved) setContacts(JSON.parse(saved));
    }, []);

    const saveContacts = (newContacts: GhostContact[]) => {
        setContacts(newContacts);
        localStorage.setItem('ghost_contacts', JSON.stringify(newContacts));
    };

    const addContact = () => {
        if (!newContact.codename || !newContact.peerId) return;
        const contact: GhostContact = {
            id: Math.random().toString(36).substring(2, 9),
            ...newContact
        };
        saveContacts([...contacts, contact]);
        setNewContact({ codename: '', peerId: '', notes: '' });
        setShowAddForm(false);
    };

    const deleteContact = (id: string) => {
        saveContacts(contacts.filter(c => c.id !== id));
    };

    const filteredContacts = contacts.filter(c =>
        c.codename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.peerId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[180] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-black border border-white/10 flex flex-col h-[600px] shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0" />

                <header className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <User className="text-cyan-500" size={24} />
                        <div>
                            <h3 className="text-lg font-light uppercase tracking-tight text-white italic" title="Contacts">Contacts</h3>
                            <p className="text-[8px] font-black text-zinc-800 uppercase tracking-widest mt-1" title="Direct Calling">Direct Calling</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-zinc-700 hover:text-white transition-all" title="Close Contact Manager"><X size={20} /></button>
                </header>

                <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-800" size={14} />
                        <input
                            className="w-full bg-[#050505] border border-white/5 py-3 pl-12 pr-4 text-[10px] text-white focus:outline-none focus:border-cyan-500/30 uppercase tracking-widest font-mono"
                            placeholder="SEARCH CONTACTS..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
                    {filteredContacts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                            <Activity size={48} className="text-zinc-500 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Contacts Found</p>
                        </div>
                    ) : (
                        filteredContacts.map(contact => (
                            <div key={contact.id} className="p-4 bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 transition-all flex items-center justify-between group">
                                <div className="flex items-center gap-5">
                                    <div className="w-10 h-10 rounded-sm bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                        <User size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-black uppercase text-white tracking-widest">{contact.codename}</span>
                                        <span className="text-[8px] font-mono text-cyan-900 uppercase mt-1 tracking-tight">{contact.peerId}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onCall(contact.peerId)}
                                        title="Call Contact"
                                        className="w-10 h-10 flex items-center justify-center bg-cyan-500 text-black rounded-sm hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                                    >
                                        <Phone size={16} />
                                    </button>
                                    <button
                                        onClick={() => deleteContact(contact.id)}
                                        title="Delete Contact"
                                        className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-red-500 hover:bg-red-500/5 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <footer className="p-6 border-t border-white/5">
                    {showAddForm ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[7px] font-black text-zinc-700 uppercase tracking-widest pl-1">Contact Name</label>
                                    <input
                                        className="w-full bg-[#050505] border border-white/10 p-3 text-[10px] text-white focus:outline-none focus:border-cyan-500/30"
                                        placeholder="NAME"
                                        value={newContact.codename}
                                        onChange={e => setNewContact({ ...newContact, codename: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[7px] font-black text-zinc-700 uppercase tracking-widest pl-1">Meeting ID / User ID</label>
                                    <input
                                        className="w-full bg-[#050505] border border-white/10 p-3 text-[10px] text-white focus:outline-none focus:border-cyan-500/30"
                                        placeholder="GHOST-XXXX"
                                        value={newContact.peerId}
                                        onChange={e => setNewContact({ ...newContact, peerId: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowAddForm(false)} className="flex-1 py-4 text-[9px] font-black text-zinc-800 hover:text-white uppercase tracking-widest">Cancel</button>
                                <button onClick={addContact} className="flex-1 py-4 bg-cyan-500 text-black text-[9px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,229,255,0.2)]">Add Contact</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-4 border border-white/5 bg-white/[0.02] text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white hover:border-cyan-500/30 transition-all flex items-center justify-center gap-3"
                        >
                            <UserPlus size={14} />
                            Add New Contact
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};
