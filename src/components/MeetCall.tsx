import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Mic,
    MicOff,
    Video as VideoIcon,
    VideoOff,
    PhoneOff,
    Settings,
    Link as LinkIcon,
    Check,
    EyeOff,
    MonitorUp,
    MonitorOff,
    Loader2,
    AlertCircle,
    Eye,
    MessageSquare,
    Send,
    ChevronRight,
    BookOpen,
    Shield,
    ToggleRight,
    ToggleLeft,
    UserPlus,
    UserMinus,
    Sun,
    Moon,
    Smile,
    Activity,
    Users
} from 'lucide-react';
import Peer, { type DataConnection } from 'peerjs';
import { Logo } from './Logo';
import type { NodeRole, ChatMessage } from '../types';
import { supabase, isCloudBackupActive } from '../lib/supabase';
import { getPublicIP } from '../lib/ip';

const CODENAMES = [
    'Specter', 'Wraith', 'Phantom', 'Banshee', 'Shade', 'Poltergeist',
    'Revenant', 'Eidolon', 'Spirit', 'Shadow', 'Gorgon', 'Hydra',
    'Kraken', 'Chimera', 'Void', 'Null', 'Vector', 'Cipher',
    'Static', 'Neon', 'Echo', 'Vortex'
];

interface RemotePeer {
    peerId: string;
    stream: MediaStream;
    role: NodeRole;
    codename: string;
}

interface MeetCallProps {
    onClose: () => void;
    externalRoomId?: string | null;
    userName?: string;
    isHost?: boolean;
    isGuest?: boolean;
}

interface PermissionToggleProps {
    icon: React.ReactNode;
    label: string;
    desc: string;
    active: boolean;
    onClick: () => void;
}

interface VideoTileProps {
    stream: MediaStream | null;
    isMuted?: boolean;
    isCameraOff?: boolean;
    isLocal?: boolean;
    isScreen?: boolean;
    videoRef?: React.RefObject<HTMLVideoElement | null>;
    role: NodeRole;
    codename: string;
    isEnhanced?: boolean;
    onAddContact?: () => void;
    onKick?: () => void;
    onRefresh?: () => void;
    onClick?: () => void;
}

// --- Helper Components (Hoisted to avoid TDZ) ---


const getAvatarColor = (name: string) => {
    const hues = [210, 260, 280, 20, 140, 180, 330]; 
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hues[Math.abs(hash) % hues.length]}, 65%, 55%)`;
};

let globalAudioCtx: AudioContext | null = null;
const getAudioCtx = () => {
    if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
    }
    return globalAudioCtx;
};

const playLobbySound = () => {
    try {
        const audioCtx = getAudioCtx();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Dual-tone high-vis sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3); 

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.1); // Louder
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
        console.error('Lobby sound failed:', e);
    }
};

// --- Advanced Zero-Latency WebRTC Optimization (SDP Filtering) ---
const filterSDP = (sdp: string) => {
    let lines = sdp.split('\n');
    
    // 1. Connectivity: Remove IPv6/mDNS candidates for faster ICE
    lines = lines.filter(line => !line.includes('typ host') || !line.includes(':'))
                 .filter(line => !line.includes('.local'));

    // 2. Audio: Force Studio-Grade Opus (510kbps, Stereo, Low Latency)
    lines = lines.map(line => {
        if (line.includes('a=fmtp:') && line.includes('opus')) {
            // Ultra-Low-Latency: minptime=10 for faster packet dispatch
            return line.split(' ')[0] + ' minptime=10; ptime=10; maxptime=20; useinbandfec=1; stereo=1; sprop-stereo=1; maxaveragebitrate=510000; usedtx=0';
        }
        return line;
    });

    // 3. Video: Force UHD Bitrates (8Mbps+)
    // Inject b=AS and b=TIAS lines after every m=video line
    const result = [];
    for (let i = 0; i < lines.length; i++) {
        result.push(lines[i]);
        if (lines[i].startsWith('m=video')) {
            result.push('b=AS:8000');
            result.push('b=TIAS:8000000');
        }
    }

    return result.join('\n');
};

// --- Nuclear SDP Patch (Global Handshake Acceleration) ---
if (typeof window !== 'undefined' && (window as any).RTCPeerConnection) {
    const originalSetLocal = (window as any).RTCPeerConnection.prototype.setLocalDescription;
    (window as any).RTCPeerConnection.prototype.setLocalDescription = function(...args: any[]) {
        const description = args[0];
        if (description && description.sdp) {
            description.sdp = filterSDP(description.sdp);
        }
        return originalSetLocal.apply(this, args);
    };
}

// --- Advanced Digital Audio Chain for Studio-Clear Voice (Fan Killer) ---
const applyAudioProcess = (stream: MediaStream) => {
    try {
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) return stream;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'interactive' });
        const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
        
        // STAGE 1: Aggressive High-pass filter to kill low-frequency fan drone (Target: < 220Hz)
        const hpf = audioContext.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 220;
        hpf.Q.value = 1.0;
        
        // STAGE 2: Notch filter to specifically target common 50Hz/60Hz electrical hum & fan harmonics
        const notch = audioContext.createBiquadFilter();
        notch.type = 'notch';
        notch.frequency.value = 60;
        notch.Q.value = 10;
        
        // STAGE 3: Peaking filter for "Mirrored Presence" (Vocal Boost at 2.5kHz)
        const presence = audioContext.createBiquadFilter();
        presence.type = 'peaking';
        presence.frequency.value = 2500;
        presence.Q.value = 1.0;
        presence.gain.value = 6;
        
        // STAGE 4: Dynamics Compressor to act as a Noise Gate + Volume Leveler
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -35; // Aggressive floor to cut low-volume fans
        compressor.knee.value = 20;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.2;
        
        const destination = audioContext.createMediaStreamDestination();
        source.connect(hpf);
        hpf.connect(notch);
        notch.connect(presence);
        presence.connect(compressor);
        compressor.connect(destination);
        
        return destination.stream;
    } catch (e) {
        console.warn('[VIRTUAL_CIRCUIT] Hardware Audio Chain Failed:', e);
        return stream;
    }
};

function PermissionToggle({ icon, label, desc, active, onClick, title }: PermissionToggleProps & { title?: string }) {
    return (
        <div onClick={onClick} title={title} className={`p-4 border transition-all cursor-pointer flex items-center justify-between rounded-sm ${active ? 'bg-cyan-500/5 border-cyan-500/30 shadow-[0_0_20px_rgba(0,229,255,0.05)]' : 'bg-black border-white/5 opacity-40 hover:opacity-100'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? 'bg-cyan-500 text-black' : 'bg-zinc-900 text-zinc-700'}`}>{icon}</div>
                <div>
                    <div className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-zinc-600'}`}>{label}</div>
                    <div className="text-[7px] text-zinc-800 uppercase font-bold mt-0.5">{desc}</div>
                </div>
            </div>
            {active ? <ToggleRight className="text-cyan-500" size={20} /> : <ToggleLeft className="text-zinc-800" size={20} />}
        </div>
    );
}

function VideoTile({ stream, isMuted, isCameraOff, isLocal, isScreen, videoRef: externalVideoRef, role, codename, isEnhanced, onAddContact, onKick, onRefresh, isLowLight }: VideoTileProps & { isLowLight?: boolean }) {
    const internalVideoRef = useRef<HTMLVideoElement>(null);
    const videoRef = externalVideoRef || internalVideoRef;
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream) return;
        
        const attemptPlay = async () => {
            try {
                if (!video.srcObject || video.srcObject !== stream) {
                    video.srcObject = stream;
                }
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        console.warn('Wait for interaction to play');
                        setIsPlaying(false);
                    });
                }
            } catch (e) {
                console.warn('Playback error:', e);
            }
        };

        video.onloadedmetadata = () => attemptPlay();
        attemptPlay();

        let audioCtx: AudioContext | null = null;
        if (!isMuted && !isLocal && stream.getAudioTracks().length > 0) {
            try {
                audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioCtxRef.current = audioCtx;
                const source = audioCtx.createMediaStreamSource(stream);
                const gainNode = audioCtx.createGain();
                gainNodeRef.current = gainNode;
                gainNode.gain.value = (window as any).GHOST_SPEAKER_BOOST || 1.0;
                source.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                video.muted = true;
            } catch (e) {
                console.error("Audio Boost Failed:", e);
            }
        }
        return () => { if (audioCtx) audioCtx.close().catch(() => { }); };
    }, [stream, isMuted, isLocal]);

    const handleManualPlay = () => {
        const video = videoRef.current;
        if (video) video.play().catch(() => {});
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    useEffect(() => {
        if (gainNodeRef.current && audioCtxRef.current) {
            gainNodeRef.current.gain.setTargetAtTime((window as any).GHOST_SPEAKER_BOOST || 1.0, audioCtxRef.current.currentTime, 0.1);
        }
    }, [stream]);

    return (
        <div 
            onClick={() => {
                handleManualPlay();
                if (onClick) onClick();
            }}
            className="relative w-full aspect-[9/16] md:aspect-video bg-[#050505] border border-white/[0.05] rounded-sm overflow-hidden group shadow-2xl flex items-center justify-center cursor-pointer active:scale-[0.98] transition-all duration-300"
        >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted={isLocal || isMuted} 
              onPlay={() => setIsPlaying(true)}
              style={{ 
                filter: `
                    ${isLowLight ? 'brightness(1.8) contrast(1.3) saturate(1.2) sepia(0.05)' : (isEnhanced ? 'brightness(1.1) contrast(1.15) saturate(1.25)' : 'none')}
                    ${!isLocal ? 'contrast(1.15) brightness(1.08) saturate(1.2) drop-shadow(0 0 8px rgba(0,229,255,0.15))' : ''}
                `.trim(),
                imageRendering: 'pixelated',
                boxShadow: !isLocal ? 'inset 0 0 60px rgba(0,229,255,0.08)' : 'none'
              }} 
              className={`w-full h-full ${isScreen ? 'object-contain bg-black' : 'object-cover'} transition-all duration-1000 ${isLocal && !isScreen ? 'scale-x-[-1]' : ''} ${isCameraOff ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`} 
            />
            
            {!isLocal && !isCameraOff && !isPlaying && (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                     <div className="bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/40 p-2 rounded-full">
                        <MonitorUp size={16} className="text-cyan-400" />
                     </div>
                     <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest mt-2">Tap to Sync Media</span>
                </div>
            )}

            {isCameraOff && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-md">
                    <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center bg-black/40"><EyeOff size={32} className="text-zinc-900" /></div>
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.5em]">SIGNAL_MASKED</span>
                </div>
            )}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <div className="px-4 py-2 bg-black/80 border border-white/10 flex items-center gap-3 rounded-sm">
                    <div className={`w-2 h-2 rounded-full ${role === 'origin' ? 'bg-cyan-500' : 'bg-green-500'} animate-pulse shadow-[0_0_10px_currentColor]`} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">{codename} {role === 'origin' && <span className="ml-2 text-cyan-600 font-mono">[HOST]</span>}</span>
                    {!isLocal && onAddContact && (
                        <button onClick={(e) => { e.stopPropagation(); onAddContact(); }} title="Add to Contacts" className="ml-2 text-zinc-500 hover:text-cyan-500 transition-colors pointer-events-auto">
                            <UserPlus size={12} />
                        </button>
                    )}
                    {!isLocal && onKick && (
                        <button onClick={(e) => { e.stopPropagation(); onKick(); }} title="Remove from Meeting" className="ml-2 text-zinc-500 hover:text-red-500 transition-colors pointer-events-auto">
                            <UserMinus size={12} />
                        </button>
                    )}
                    {!isLocal && onRefresh && (
                        <button onClick={(e) => { e.stopPropagation(); onRefresh(); }} title="Refresh Signal" className="ml-2 text-zinc-500 hover:text-green-500 transition-colors pointer-events-auto">
                            <Activity size={12} />
                        </button>
                    )}
                </div>
                {isScreen && <div className="px-3 py-1 bg-cyan-500 text-black text-[8px] font-black uppercase tracking-widest rounded-sm">SCREEN_SHARING</div>}
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-5 mesh-grid" />
        </div>
    );
}

function ControlBtn({ icon, active, onClick, disabled, title, className, sizeOverride }: ControlBtnProps & { title?: string, className?: string, sizeOverride?: number }) {
    const isMobile = window.innerWidth < 768;
    const size = sizeOverride || (isMobile ? 16 : 24);
    
    return (
        <button onClick={onClick} disabled={disabled} title={title} className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-sm transition-all border ${disabled ? 'opacity-10 cursor-not-allowed grayscale' : active ? 'bg-[var(--accent)] text-black border-[var(--accent)] shadow-[0_0_20px_rgba(0,229,255,0.4)]' : 'text-[var(--text)] border-transparent hover:bg-[var(--btn-bg)] hover:border-[var(--border)]'} ${className}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size })}
        </button>
    );
}

const MeetCall: React.FC<MeetCallProps> = ({ onClose, externalRoomId, userName, isHost = false, isGuest = false }) => {
    const [roomId] = useState(
        () => (externalRoomId || Math.random().toString(36).substring(2, 8)).toUpperCase().trim()
    );
    const [myCodename] = useState(
        () => userName || CODENAMES[Math.floor(Math.random() * CODENAMES.length)].toUpperCase() + '-' + Math.floor(Math.random() * 900 + 100)
    );

    const [myRole] = useState<NodeRole>(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('role') === 'shadow') return 'shadow';
        return isHost ? 'origin' : 'node';
    });

    const [reqMic, setReqMic] = useState(true);
    const [reqCam, setReqCam] = useState(true);

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [micBoost, setMicBoost] = useState(100);
    const [speakerBoost, setSpeakerBoost] = useState(100);
    const [isEnhanced, setIsEnhanced] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showBriefing, setShowBriefing] = useState(false);

    useEffect(() => {
        (window as any).GHOST_SPEAKER_BOOST = speakerBoost / 100;
        (window as any).GHOST_MIC_BOOST = micBoost / 100;
    }, [speakerBoost, micBoost]);

    const [inviteRole, setInviteRole] = useState<NodeRole>('node');
    const [ghostMode] = useState(true);
    const [copied, setCopied] = useState(false);
    const [statusMsg, setStatusMsg] = useState('Standby...');
    const [hasMediaAccess, setHasMediaAccess] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLowLight, setIsLowLight] = useState(false);
    const [focusedPeerId, setFocusedPeerId] = useState<string | null>(null);
    const [showEmojis, setShowEmojis] = useState(false);
    const [lobbyPeers, setLobbyPeers] = useState<{peerId: string, codename: string}[]>([]);
    const [isAdmitted, setIsAdmitted] = useState(isHost);
    const EMOJIS = ['🐱', '🐶', '🐈', '🐕', '🐾', '👻', '✨', '💎', '🔥', '🚀', '🔒', '🦾', '🎯', '⚡', '🛸'];

    const peerRef = useRef<Peer | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const callsRef = useRef<Map<string, any>>(new Map());
    const dataConnsRef = useRef<Map<string, DataConnection>>(new Map());
    const chatEndRef = useRef<HTMLDivElement>(null);
    const admittedPeersRef = useRef<Set<string>>(new Set());
    const lastSyncRef = useRef<number>(Date.now());

    const [userIp, setUserIp] = useState<string>('0.0.0.0');

    useEffect(() => {
        getPublicIP().then(setUserIp);
    }, []);

    // WhatsApp UX: Auto-focus the remote peer in 1-on-1 sessions
    useEffect(() => {
        const eligiblePeers = remotePeers.filter(p => p.role !== 'shadow');
        if (eligiblePeers.length === 1 && !focusedPeerId) {
            setFocusedPeerId(eligiblePeers[0].peerId);
        } else if (eligiblePeers.length === 0 && focusedPeerId) {
            setFocusedPeerId(null);
        }
    }, [remotePeers.length, focusedPeerId]);

    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showChat]);

    const authorizeAll = () => {
        setReqMic(true);
        setReqCam(true);
    };




    // Mobile Fix: Global user interaction listener to resume AudioContexts
    useEffect(() => {
        const handleInteraction = () => {
            getAudioCtx(); // Ensure global context is active
            const allAudios = document.querySelectorAll('video');
            allAudios.forEach(v => {
                if (v.paused && v.srcObject) (v as HTMLVideoElement).play().catch(() => {});
            });
        };
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    // 0. Lobby Pulse (Participant Side)
    useEffect(() => {
        if (isHost || isAdmitted || !hasMediaAccess) return;
        
        const hostId = `GHOST-CONF-${roomId}-HOST`;
        const pulse = setInterval(() => {
            const conn = dataConnsRef.current.get(hostId);
            if (conn && conn.open) {
                conn.send({ type: 'LOBBY_REQUEST', codename: myCodename });
                console.log('[LOBBY] Pulsing admission request to Host');
            } else {
                // If connection lost, try to reconnect to Host
                connectToPeer(hostId);
            }
        }, 30000); // 30s pulse
        
        return () => clearInterval(pulse);
    }, [isHost, isAdmitted, roomId, myCodename, hasMediaAccess]);

    // 0.5 Media Recovery Heartbeat (Audit every 30s)
    useEffect(() => {
        if (!hasMediaAccess) return;
        
        const heartbeat = setInterval(() => {
            const now = Date.now();
            if (now - lastSyncRef.current < 25000) return; // Prevent overlapping
            
            remotePeers.forEach(peer => {
                const tracks = peer.stream?.getTracks() || [];
                if (tracks.length === 0 && peer.role !== 'shadow') {
                    console.warn(`[RECOVERY] Dead stream detected for ${peer.peerId}. Re-syncing...`);
                    connectToPeer(peer.peerId);
                }
            });
            lastSyncRef.current = now;
        }, 30000);
        
        return () => clearInterval(heartbeat);
    }, [remotePeers, hasMediaAccess]);

    useEffect(() => {
        const handleUnload = async () => {
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            screenStreamRef.current?.getTracks().forEach((t) => t.stop());
            
            if (isCloudBackupActive()) {
                await (supabase as any).from('meeting_signaling').delete().eq('peer_id', peerRef.current?.id);
            }
            
            peerRef.current?.destroy();
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, []);

    useEffect(() => {
        // Initial Mount setup
    }, []);

    // 1. Peer Initialization (ONCE)
    useEffect(() => {
        if (!peerRef.current) {
            initNode();
        }
    }, [roomId]);

    // 2. Media Initialization (When permissions or Peer changes)
    useEffect(() => {
        const updateMedia = async () => {
            if (!hasMediaAccess || !peerRef.current) return;
            try {
                // If we already have a stream, just update tracks if needed
                // For simplicity on mobile, we'll just re-fetch if requested hardware changed
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: reqCam ? { 
                        width: { ideal: 1920, min: 1280 }, 
                        height: { ideal: 1080, min: 720 },
                        frameRate: { ideal: 30, max: 60 },
                        aspectRatio: window.innerHeight > window.innerWidth ? 0.5625 : 1.7777777778
                    } : false,
                    audio: reqMic ? {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 2,
                        sampleRate: 48000,
                        sampleSize: 16,
                        // Advanced Noise Filtering (Chrome/Edge/Safari support vary)
                        // Using any-type to bypass strict TS for experimental constraints
                        ...({
                            googEchoCancellation: true,
                            googAutoGainControl: true,
                            googNoiseSuppression: true,
                            googHighpassFilter: true,
                            googTypingNoiseDetection: true,
                            googAudioMirroring: false,
                            googJitterBufferTargetMs: 0,
                            googJitterBufferMaxMs: 150
                        } as any)
                    } : false
                });

                // Apply Ultra-Quality Priority (Antigravity Mode)
                newStream.getVideoTracks().forEach(t => { 
                    t.contentHint = 'detail';
                    if ((t as any).applyConstraints) {
                        (t as any).applyConstraints({ 
                            degradationPreference: 'maintain-resolution',
                            googCpuOveruseDetection: false,
                            googHighpassFilter: true,
                            googEchoCancellation: true,
                            googAutoGainControl: true,
                            googNoiseSuppression: true
                        } as any);
                    }
                });
                newStream.getAudioTracks().forEach(t => { t.contentHint = 'speech'; });
                
                // Replace tracks in all active calls
                const videoTrack = newStream.getVideoTracks()[0];
                const audioTrack = newStream.getAudioTracks()[0];
                
                await replaceTrackInCalls(videoTrack);
                // Note: PeerJS audio track replacement is more complex, 
                // but usually handled by stream answer.
                
                // --- Apply Studio-Grade Audio Processing (Fan Suppression) ---
                const processedStream = applyAudioProcess(newStream);
                const finalStream = new MediaStream([
                    ...newStream.getVideoTracks(),
                    ...processedStream.getAudioTracks()
                ]);

                localStreamRef.current = finalStream;
                if (localVideoRef.current) localVideoRef.current.srcObject = finalStream;
            } catch (err) {
                console.warn('[MEDIA_SYNC] Failed to update media tracks:', err);
            }
        };

        if (hasMediaAccess) updateMedia();
    }, [reqMic, reqCam, hasMediaAccess]);

    // 3. Signaling & Discovery (When Peer is OPEN)
    useEffect(() => {
        let signalChannel: any = null;
        let pulseInterval: any = null;

        const setupSignaling = async () => {
          if (!peerRef.current || !peerRef.current.open) return;

          if (isCloudBackupActive()) {
              // A. Discovery Channel: Listen for FUTURE peers joining
              signalChannel = (supabase as any)
                  .channel(`signaling-${roomId}`)
                  .on('postgres_changes', { 
                      event: 'INSERT', 
                      schema: 'public', 
                      table: 'meeting_signaling', 
                      filter: `room_id=eq.${roomId}` 
                  }, (payload: any) => {
                      const newPeerId = payload.new.peer_id;
                      if (newPeerId !== peerRef.current?.id) {
                          console.log(`[GLOBAL_SIGNAL] Discovery Update: ${newPeerId}`);
                          
                          // GLOBAL SYNC: If Host sees ANY new peer in signaling table, 
                          // add to lobby immediately as a "Cloud-Symmetric" fail-safe.
                          if (isHost && !admittedPeersRef.current.has(newPeerId)) {
                              setLobbyPeers(prev => {
                                  if (prev.find(p => p.peerId === newPeerId)) return prev;
                                  playLobbySound();
                                  return [...prev, { 
                                      peerId: newPeerId, 
                                      codename: payload.new.codename || 'REMOTE-NODE' 
                                  }];
                              });
                          }

                          // Also Check for Cloud Signals
                          if (payload.new.type === 'SIGNAL' && payload.new.target_id === peerRef.current?.id) {
                              const signalData = payload.new.data;
                              console.log('[CLOUD_SIGNAL] Received Direct Signal:', signalData.type);
                              
                              if (signalData.type === 'LOBBY_ADMIT') {
                                  setIsAdmitted(true);
                                  addSystemMessage('SECURITY CLEARANCE GRANTED: ENTERING SESSION');
                                  // Immediate Call-Back to Host to bridge media instantly
                                  const hostId = payload.new.peer_id;
                                  if (hostId && !callsRef.current.has(hostId)) {
                                       const streamToSend = isScreenSharing && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current;
                                       const call = peerRef.current?.call(hostId, streamToSend || new MediaStream(), { 
                                           metadata: { codename: myCodename }
                                       });
                                       if (call) {
                                           call.on('stream', (s) => handleRemoteStream(hostId, s));
                                           call.on('close', () => removePeer(hostId));
                                           callsRef.current.set(hostId, call);
                                       }
                                  }
                              } else if (signalData.type === 'LOBBY_REJECT') {
                                  handleCloudSignal(payload.new.data);
                              }
                          } else {
                              connectToPeer(newPeerId);
                          }
                      }
                  })
                  .subscribe();

              // B. Initial Discovery: Fetch EXISTING peers immediately
              resyncRoom();

              // C. Active Meeting Registry (Host Only)
              if (isHost || myRole === 'origin') {
                  const registerMeeting = async () => {
                      const ip = await getPublicIP();
                      await (supabase as any).from('active_meetings').upsert({
                          room_id: roomId,
                          host_name: userName || myCodename,
                          host_ip: ip,
                          is_public: true,
                          last_pulse: new Date().toISOString()
                      });
                  };
                  registerMeeting();
                  pulseInterval = setInterval(registerMeeting, 30000); // 30s pulse
              }
          }
        };

        const checkPeer = setInterval(() => {
          if (peerRef.current?.open) {
            setupSignaling();
            clearInterval(checkPeer);
          }
        }, 1000);

        return () => {
            clearInterval(checkPeer);
            if (signalChannel) (supabase as any).removeChannel(signalChannel);
            if (pulseInterval) clearInterval(pulseInterval);
        };
    }, [roomId, isHost]);

    const initNode = async () => {
        try {
            setError(null);
            setIsConnecting(true);
            setStatusMsg('Hardware Handshake...');

            let stream: MediaStream;
            if (myRole === 'shadow') {
                stream = new MediaStream();
                setIsMuted(true);
                setIsCameraOff(true);
            } else {
                if (!reqMic && !reqCam) {
                    stream = new MediaStream();
                    setIsMuted(true);
                    setIsCameraOff(true);
                } else {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: reqCam ? { 
                            width: { ideal: 1920 }, 
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30, max: 60 },
                            aspectRatio: window.innerHeight > window.innerWidth ? 0.5625 : 1.7777777778
                        } : false,
                        audio: reqMic ? {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            channelCount: 2,
                            ...({
                                googEchoCancellation: true,
                                googAutoGainControl: true,
                                googNoiseSuppression: true,
                                googHighpassFilter: true,
                                googTypingNoiseDetection: true,
                                googJitterBufferTargetMs: 0
                            } as any)
                        } : false
                    });
                    
                    // --- Apply Studio-Grade Audio Processing (Fan Suppression) ---
                    const processedStream = applyAudioProcess(stream);
                    const finalStream = new MediaStream([
                        ...stream.getVideoTracks(),
                        ...processedStream.getAudioTracks()
                    ]);
                    
                    // Apply Quality Priority & No Throttling
                    finalStream.getVideoTracks().forEach(t => { 
                        t.contentHint = 'detail';
                        if ((t as any).applyConstraints) {
                            (t as any).applyConstraints({ 
                                degradationPreference: 'maintain-resolution',
                                googCpuOveruseDetection: false,
                                googHighpassFilter: true,
                                googEchoCancellation: true,
                                googAutoGainControl: true,
                                googNoiseSuppression: true
                            } as any);
                        }
                    });
                    finalStream.getAudioTracks().forEach(t => { t.contentHint = 'speech'; });

                    setIsMuted(!reqMic);
                    setIsCameraOff(!reqCam);
                    localStreamRef.current = finalStream;
                }
            }

            setHasMediaAccess(true);
        } catch (err) {
            console.warn('[HARDWARE] Access denied or blocked. Falling back to Silent Mode.', err);
            localStreamRef.current = new MediaStream();
            setHasMediaAccess(true); // Allow proceeding in silent mode
            setIsMuted(true);
            setIsCameraOff(true);
            addSystemMessage('HARDWARE_LOCKED: ENTERING IN SILENT_NODE (OBSERVER_ONLY)');
        }

        try {
            const myId = myRole === 'origin' 
                ? `GHOST-CONF-${roomId}-HOST` 
                : `GHOST-CONF-${roomId}-PART-${Math.random().toString(36).substring(2, 6)}`;
            
            const peer = new Peer(myId, {
                host: '0.peerjs.com',
                port: 443,
                secure: true,
                debug: 3,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun.metered.ca:443' },
                        {
                            urls: 'turn:openrelay.metered.ca:443',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        }
                    ],
                    // Optimization: Zero-Latency ICE & Force Trickle
                    iceCandidatePoolSize: 0, 
                    bundlePolicy: 'max-bundle',
                    rtcpMuxPolicy: 'require',
                    sdpSemantics: 'unified-plan',
                    iceTransportPolicy: 'all'
                }
            });
            
            // Nuclear Handshake: Proactive Media Dialing
            const originalCall = peer.call.bind(peer);
            peer.call = (id: string, stream: MediaStream, options: any = {}) => {
                const call = originalCall(id, stream, { 
                    ...options, 
                    streamConnectionConstraints: { iceCandidatePoolSize: 0 } 
                });
                (call as any).on('error', (err: any) => console.error('[PEER_MC] Fast-Dial Error:', err));
                return call;
            };
            peerRef.current = peer;

            peer.on('open', () => {
                setIsConnecting(false);
                setStatusMsg(`Meeting Live: ${roomId}`);
                addSystemMessage(`${myCodename.toUpperCase()} JOINED THE MEETING`);
                
                // Reliable Signaling Fallback: Register presence in Supabase
                if (isCloudBackupActive()) {
                    (supabase as any).from('meeting_signaling').insert({
                        room_id: roomId,
                        peer_id: myId,
                        codename: myCodename,
                        sender_ip: userIp
                    });
                }
                
                if (myRole !== 'origin' && externalRoomId) {
                    const hostId = `GHOST-CONF-${roomId}-HOST`;
                    connectToPeer(hostId);
                }
            });

            peer.on('connection', (conn) => setupDataConnection(conn));
            
            peer.on('call', (call) => {
                // Security: Only answer if we are admitted, we are the host, or it's the Host calling us (Handshake)
                const isFromHost = call.peer.endsWith('-HOST');
                if (!isAdmitted && !isHost && !isFromHost) return;

                const streamToSend =
                    isScreenSharing && screenStreamRef.current
                        ? screenStreamRef.current
                        : localStreamRef.current;
                
                // CRITICAL: Always answer with a stream object, even if empty, to establish the bridge
                call.answer(streamToSend || new MediaStream());
                call.on('stream', (remoteStream) => {
                    handleRemoteStream(call.peer, remoteStream);
                });
                call.on('close', () => {
                    removePeer(call.peer);
                });
                callsRef.current.set(call.peer, call);
            });

            peer.on('error', (err) => {
                setError(`PROTOCOL_ERR: ${err.type}`);
                setIsConnecting(false);
            });
        } catch (err) {
            setError(
                'HARDWARE_LOCKED: Access denied. Please enable requested hardware in browser settings.'
            );
            setIsConnecting(false);
        }
    };

    const setupDataConnection = (conn: DataConnection) => {
        conn.on('open', () => {
            dataConnsRef.current.set(conn.peer, conn);
            conn.send({ type: 'META_SYNC', codename: myCodename, role: myRole });
            
            // If we are a participant and not admitted yet, request entry
            if (!isHost && !isAdmitted) {
                conn.send({ type: 'LOBBY_REQUEST', codename: myCodename });
            }
            
            // Host discovery: If I am the host and someone joins, tell everyone else to connect to them
            if (myRole === 'origin') {
                dataConnsRef.current.forEach((otherConn, otherPeerId) => {
                    if (otherPeerId !== conn.peer) {
                        otherConn.send({ type: 'PEER_DISCOVERY', targetPeerId: conn.peer });
                    }
                });
            }
        });
        conn.on('data', (data: any) => {
            if (data.type === 'CHAT') {
                setMessages((prev) => [...prev, data.message]);
                if (!showChat) {
                    setUnreadCount((prev) => prev + 1);
                }
            } else if (data.type === 'META_SYNC') {
                updatePeerCodename(conn.peer, data.codename, data.role);
                addSystemMessage(`${data.codename.toUpperCase()} ENTERED THE MEETING`);
            } else if (data.type === 'LOBBY_REQUEST') {
                // GUARD: If peer is already admitted, ignore the request
                if (admittedPeersRef.current.has(conn.peer)) {
                    console.log(`[LOBBY] Ignoring pulse from already admitted peer: ${conn.peer}`);
                    return;
                }
                
                setLobbyPeers((prev) => {
                    if (prev.find(p => p.peerId === conn.peer)) return prev;
                    playLobbySound();
                    return [...prev, { peerId: conn.peer, codename: data.codename }];
                });
                addSystemMessage(`LOBBY: ${data.codename.toUpperCase()} IS WAITING TO JOIN`);
            } else if (data.type === 'LOBBY_ADMIT') {
                setIsAdmitted(true);
                addSystemMessage('THE HOST HAS ADMITTED YOU TO THE MEETING');
                
                // Nuclear Direct-Dial: Participant also attempts to call host to force bridge
                // We add a tiny delay to allow host's call to arrive first (glare avoidance)
                setTimeout(() => {
                    const hostId = `GHOST-CONF-${roomId}-HOST`;
                    if (!callsRef.current.has(hostId)) {
                        console.log('[ZERO_DELAY] Force-Calling Host for Media Bridge...');
                        const streamToSend = isScreenSharing && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current;
                        const call = peerRef.current?.call(hostId, streamToSend || new MediaStream());
                        if (call) {
                            call.on('stream', (s) => handleRemoteStream(hostId, s));
                            call.on('close', () => removePeer(hostId));
                            callsRef.current.set(hostId, call);
                        }
                    }
                }, 500);
            } else if (data.type === 'LOBBY_ADMIT_ACK') {
                // Deprecated: Host now calls immediately in admitPeer
            } else if (data.type === 'PEER_DISCOVERY') {
                // Near Zero Latency: Connection initiated immediately
                connectToPeer(data.targetPeerId);
            } else if (data.type === 'KICK_SIGNAL') {
                addSystemMessage('ADMIN_NOTICE: YOU HAVE BEEN REMOVED FROM THE MEETING');
                setTimeout(() => endCall(), 2000);
            }
        });
        conn.on('close', () => dataConnsRef.current.delete(conn.peer));
    };

    const handleCloudSignal = (data: any) => {
        console.log('[CLOUD_SIGNAL] Received Fallback Signal:', data.type);
        if (data.type === 'LOBBY_ADMIT') {
            setIsAdmitted(true);
            addSystemMessage('CLOUD_BRIDGE: ADMISSION GRANTED EXTERNALLY');
        } else if (data.type === 'HARD_SYNC_RETRY') {
            console.warn('[ZERO_DELAY] Hard-Sync Triggered... Force Re-Calling Host');
            const hostId = `GHOST-CONF-${roomId}-HOST`;
            const streamToSend = isScreenSharing && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current;
            peerRef.current?.call(hostId, streamToSend || new MediaStream());
        }
    };
    const updatePeerCodename = (peerId: string, codename: string, role: NodeRole) => {
        setRemotePeers((prev) => {
            const exists = prev.find((p) => p.peerId === peerId);
            if (exists) return prev.map((p) => (p.peerId === peerId ? { ...p, codename, role } : p));
            return [...prev, { peerId, codename, role, stream: null }];
        });
    };

    const addSystemMessage = (text: string) => {
        const msg: ChatMessage = {
            id: `sys-${Date.now()}`,
            senderId: 'SYSTEM',
            senderName: 'SYSTEM',
            text,
            timestamp: Date.now()
        };
        setMessages((prev) => [...prev, msg]);
    };

    const connectToPeer = (targetId: string, retryCount = 0) => {
        if (!peerRef.current || !localStreamRef.current) return;
        if (callsRef.current.has(targetId) || targetId === peerRef.current.id) return;

        // Collision Prevention: Only the peer with the lexicographically higher ID initiates the call
        // EXCEPT the host, who always calls proactively to ensure connectivity.
        // EXCEPT when calling the host who always expects bi-directional lock.
        const isTargetHost = targetId.endsWith('-HOST');
        if (!isTargetHost && myRole !== 'origin' && peerRef.current.id < targetId) {
            console.log(`[SIGNALING] Passive discovery for ${targetId} (waiting for incoming call)`);
            return;
        }

        // Staggered connection for 20+ users
        // Near Zero Latency: Removed staggered delay for small/medium meetings
        try {
            const conn = peerRef.current!.connect(targetId, { reliable: true });
            setupDataConnection(conn);
            
            // Participants only call others if they are already admitted
            if (!isHost && isAdmitted) {
                const streamToSend =
                    isScreenSharing && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current;
                const call = peerRef.current!.call(targetId, streamToSend!);
                
                if (call) {
                    call.on('stream', (remoteStream) => {
                        handleRemoteStream(targetId, remoteStream);
                    });
                    
                    call.on('error', (err) => {
                        console.error(`Peer ${targetId} handshake failed:`, err);
                        // Fast retry
                        if (retryCount < 2) setTimeout(() => connectToPeer(targetId, retryCount + 1), 500);
                    });
                    call.on('close', () => removePeer(targetId));
                    callsRef.current.set(targetId, call);
                }
            }
        } catch (err) {
            console.error(`Target ${targetId} unreachable:`, err);
        }
    };

    const removePeer = (peerId: string) => {
        const peer = remotePeers.find((p) => p.peerId === peerId);
        if (peer) addSystemMessage(`USER ${peer.codename} DISCONNECTED`);
        
        setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
        
        // Cleanup calls
        const call = callsRef.current.get(peerId);
        if (call) {
            call.close();
            callsRef.current.delete(peerId);
        }
        
        // Cleanup connections
        const conn = dataConnsRef.current.get(peerId);
        if (conn) {
            conn.close();
            dataConnsRef.current.delete(peerId);
        }
        
        console.log(`[SESSION] Removed peer: ${peerId}`);
    };

    const handleRemoteStream = (peerId: string, stream: MediaStream) => {
        const parts = peerId.split('-');
        const role: NodeRole = peerId.includes('-shadow-') || peerId.includes('-SHADOW-') ? 'shadow' : peerId.includes('-HOST') ? 'origin' : 'node';
        
        // Bandwidth protection for 20+ participants
        // If more than 8 users, we keep new video off to save CPU/Network
        const autoOff = remotePeers.length > 8;
        
        setRemotePeers((prev) => {
            const exists = prev.find((p) => p.peerId === peerId);
            
            // ATOMIC TRACK VERIFICATION & BITRATE OPTIMIZATION
            if (stream) {
                const pc = callsRef.current.get(peerId)?.peerConnection;
                if (pc) {
                    pc.getSenders().forEach((sender: any) => {
                    if (sender.track?.kind === 'video') {
                        const params = sender.getParameters();
                        if (!params.encodings) params.encodings = [{}];
                        // Adaptive Bitrates: 1.5Mbps base to prevent buffer-bloat on mobile
                        params.encodings[0].maxBitrate = 2500000;
                        params.encodings[0].maxFramerate = 30;
                        params.encodings[0].networkPriority = 'high';
                        sender.setParameters(params).catch(() => {});
                    }
                    if (sender.track?.kind === 'audio') {
                        const params = sender.getParameters();
                        if (!params.encodings) params.encodings = [{}];
                        // High Fidelity Audio
                        params.encodings[0].maxBitrate = 510000;
                        params.encodings[0].priority = 'high';
                        sender.setParameters(params).catch(() => {});
                    }
                });
                
                // Zero-Latency Buffer Tuning
                const receiver = pc.getReceivers().find((r: any) => r.track?.kind === 'video');
                if (receiver && (receiver as any).playoutDelayHint !== undefined) {
                    (receiver as any).playoutDelayHint = 0;
                }
                const audioReceiver = pc.getReceivers().find((r: any) => r.track?.kind === 'audio');
                if (audioReceiver && (audioReceiver as any).playoutDelayHint !== undefined) {
                    (audioReceiver as any).playoutDelayHint = 0;
                }
                }
                
                if (stream.getTracks().length === 0) {
                    console.log(`[MEDIA] Awaiting tracks for ${peerId}...`);
                    stream.onaddtrack = () => {
                        console.log(`[MEDIA] Track arrived for ${peerId}`);
                        handleRemoteStream(peerId, stream);
                    };
                }
            }

            if (exists) {
                return prev.map((p) => p.peerId === peerId ? { ...p, stream } : p);
            }
            return [...prev, { 
                peerId, 
                stream, 
                role, 
                codename: `U-${peerId.slice(-4)}`,
                isCameraOff: autoOff,
                isMuted: false
            }];
        });
    };


    const toggleScreenShare = async () => {
        if (myRole === 'shadow') return;
        if (isScreenSharing) {
            await stopScreenShare();
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            addSystemMessage('SCREEN SHARE NOT SUPPORTED ON THIS DEVICE/BROWSER');
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });
            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];
            screenTrack.onended = () => stopScreenShare();
            await replaceTrackInCalls(screenTrack);
            if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
            setIsScreenSharing(true);
            setStatusMsg('Broadcasting Screen');
            addSystemMessage('SCREEN SHARING ACTIVE');
        } catch (err: any) {
            console.error('Screen share error:', err);
            const errorMsg = err.name === 'NotAllowedError' ? 'PERMISSION DENIED' : 'UNKNOWN FAILURE';
            addSystemMessage(`ERROR: SCREEN SHARE FAILED - ${errorMsg}`);
        }
    };

    const stopScreenShare = async () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }
        if (localStreamRef.current) {
            const cameraTrack = localStreamRef.current.getVideoTracks()[0];
            if (cameraTrack) {
                await replaceTrackInCalls(cameraTrack);
                if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
            }
        }
        setIsScreenSharing(false);
        setStatusMsg(`Meeting Active: ${roomId}`);
        addSystemMessage('SCREEN SHARING STOPPED');
    };

    const replaceTrackInCalls = async (newTrack: MediaStreamTrack) => {
        const promises: Promise<void>[] = [];
        callsRef.current.forEach((call) => {
            const peerConnection = call.peerConnection;
            if (peerConnection) {
                const senders = peerConnection.getSenders();
                const videoSender = senders.find((s: any) => s.track?.kind === 'video');
                if (videoSender) promises.push(videoSender.replaceTrack(newTrack));
            }
        });
        await Promise.all(promises);
    };

    const sendMessage = () => {
        if (!chatInput.trim()) return;
        const msg: ChatMessage = {
            id: Date.now().toString(),
            senderId: peerRef.current?.id || 'local',
            senderName: myCodename,
            text: chatInput,
            timestamp: Date.now()
        };
        setMessages((prev) => [...prev, msg]);
        dataConnsRef.current.forEach((conn) => conn.send({ type: 'CHAT', message: msg }));
        setChatInput('');
    };

    const toggleMic = () => {
        if (myRole === 'shadow') return;
        if (localStreamRef.current) {
            const audio = localStreamRef.current.getAudioTracks()[0];
            if (audio) {
                audio.enabled = !audio.enabled;
                setIsMuted(!audio.enabled);
            }
        }
    };

    const toggleCam = () => {
        if (myRole === 'shadow') return;
        if (localStreamRef.current && !isScreenSharing) {
            const video = localStreamRef.current.getVideoTracks()[0];
            if (video) {
                video.enabled = !video.enabled;
                setIsCameraOff(!video.enabled);
            }
        }
    };

    const copyInvite = () => {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('room', roomId);
        url.searchParams.set('host', userName || 'Member');
        if (inviteRole === 'shadow') {
            url.searchParams.set('role', 'shadow');
        }
        
        navigator.clipboard.writeText(url.toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const admitPeer = (peerId: string) => {
        const conn = dataConnsRef.current.get(peerId);
        
        // 1. GLOBAL CLOUD ADMISSION: Send signal via Supabase (Bypasses NAT/Firewalls)
        if (isCloudBackupActive()) {
            (supabase as any).from('meeting_signaling').insert({
                room_id: roomId,
                peer_id: peerRef.current?.id, // from host
                target_id: peerId, // to participant
                type: 'SIGNAL',
                data: { type: 'LOBBY_ADMIT' },
                sender_ip: userIp,
                created_at: new Date().toISOString()
            });
        }

        // 2. Direct P2P Admission (Standard path)
        if (conn) {
            conn.send({ type: 'LOBBY_ADMIT' });
        }
        
        // Finalize Admission state locally
        admittedPeersRef.current.add(peerId);
        setLobbyPeers((prev) => prev.filter(p => p.peerId !== peerId));
        addSystemMessage(`ADMITTING ${peerId} (SESSION_BRIDGE_ACTIVE)...`);
        
        // Host Side: Initiate call IMMEDIATELY after sending admit signal
        // We use a shorter delay of 30ms to maximize speed
        setTimeout(() => {
            const streamToSend = isScreenSharing && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current;
            const call = peerRef.current!.call(peerId, streamToSend || new MediaStream());
            if (call) {
                // Direct-Dial Monitoring: Force faster ICE by attaching handlers early
                call.on('stream', (remoteStream) => handleRemoteStream(peerId, remoteStream));
                call.on('close', () => removePeer(peerId));
                callsRef.current.set(peerId, call);
                
                // If it hasn't connected in 4s, trigger a "Hard Re-Call" via Supabase metadata
                setTimeout(() => {
                    if (!callsRef.current.get(peerId)?.open) {
                        console.warn('[ZERO_DELAY] Stalled Connection Detected... Sending Hard-Sync Over Cloud');
                        if (isCloudBackupActive()) {
                             (supabase as any).from('meeting_signaling').insert({
                                room_id: roomId,
                                peer_id: peerRef.current?.id,
                                target_id: peerId,
                                type: 'SIGNAL',
                                data: { type: 'HARD_SYNC_RETRY' }
                            });
                        }
                    }
                }, 4000);
            }
        }, 30);
    };

    const kickPeer = (peerId: string) => {
        const conn = dataConnsRef.current.get(peerId);
        if (conn) {
            conn.send({ type: 'KICK_SIGNAL' });
            removePeer(peerId);
            addSystemMessage(`REMOVED PARTICIPANT FROM SESSION`);
        }
    };

    const addToContacts = (peerId: string, name: string) => {
        const saved = localStorage.getItem('ghost_contacts');
        const contacts = saved ? JSON.parse(saved) : [];
        if (contacts.find((c: any) => c.peerId === peerId)) return;
        
        const newContact = {
            id: Math.random().toString(36).substring(2, 9),
            codename: name,
            peerId: peerId
        };
        const updated = [...contacts, newContact];
        localStorage.setItem('ghost_contacts', JSON.stringify(updated));
        addSystemMessage(`ADDED ${name} TO CONTACTS`);
    };

    const resyncRoom = async () => {
        if (!peerRef.current?.open) return;
        console.log('[SIGNALING] Manual Resync Triggered');
        const { data } = await (supabase as any)
            .from('meeting_signaling')
            .select('peer_id')
            .eq('room_id', roomId);
        
        if (data && data.length > 0) {
            data.forEach((p: any) => {
                if (p.peer_id !== peerRef.current?.id) {
                    connectToPeer(p.peer_id);
                }
            });
        }
        addSystemMessage('NETWORK_RESCAN_COMPLETE: PERSISTENT MESH STABILIZED');
    };

    const endCall = () => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        peerRef.current?.destroy();
        onClose();
    };

    const getGridCols = () => {
        const broadcasters =
            remotePeers.filter((p) => p.role !== 'shadow').length + (myRole !== 'shadow' ? 1 : 0);
        
        if (broadcasters <= 1) return 'grid-cols-1 max-w-4xl';
        if (broadcasters <= 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl';
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl';
    };

    return (
        <div className={`fixed inset-0 z-[200] bg-black flex flex-col font-sans select-none overflow-hidden ${ghostMode ? 'chromatic' : ''}`}>
            <header className="h-14 md:h-16 px-4 md:px-8 flex items-center justify-between border-b border-white/[0.03] bg-black/80 backdrop-blur-2xl shrink-0 z-50">
                <div className="flex items-center gap-3 md:gap-5">
                    <Logo size={24} className="text-cyan-500 mt-1" animate={hasMediaAccess} />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-white whitespace-nowrap">ID: {roomId}</span>
                            <div className={`h-1 w-1 md:h-1.5 md:w-1.5 rounded-full ${myRole === 'shadow' ? 'bg-zinc-700' : 'bg-cyan-500'} animate-pulse shadow-[0_0_10px_currentColor]`} />
                        </div>
                        <span className="text-[6px] md:text-[7px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5 md:mt-1 truncate max-w-[100px] md:max-w-none">{statusMsg}</span>
                        <button onClick={resyncRoom} className="text-[5px] text-cyan-500/50 hover:text-cyan-500 font-black uppercase tracking-widest mt-1 text-left transition-colors">RE-SCAN NODES [STABILITY_RECOVERY]</button>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Role toggle - desktop only */}
                    <div className="hidden md:flex items-center bg-white/[0.02] border border-white/5 p-1 gap-1 rounded-sm">
                        <button onClick={() => setInviteRole('node')} className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${inviteRole === 'node' ? 'bg-cyan-500 text-black' : 'text-zinc-600 hover:text-white'}`}>HOST/PARTICIPANT</button>
                        <button onClick={() => setInviteRole('shadow')} className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${inviteRole === 'shadow' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-white'}`}>OBSERVER</button>
                    </div>

                    {/* Invite Link - collapsible on mobile */}
                    <button onClick={copyInvite} className="p-2 md:px-5 md:py-2.5 border border-white/5 bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white hover:border-cyan-500/30 transition-all flex items-center gap-3">
                        {copied ? <Check size={12} className="text-cyan-500" /> : <LinkIcon size={12} />}
                        <span className="hidden sm:inline">{copied ? 'LINK COPIED' : `INVITE`}</span>
                    </button>

                    {/* Lobby Controls for Host */}
                    {/* Lobby Controls for Host - Optimized for Mobile Overlay */}
                    {isHost && lobbyPeers.length > 0 && (
                        <div className="flex items-center gap-2">
                             <div className="flex -space-x-1 overflow-x-auto max-w-[180px] md:max-w-none no-scrollbar py-1">
                                {lobbyPeers.map(p => (
                                    <button 
                                        key={p.peerId}
                                        onClick={() => admitPeer(p.peerId)}
                                        className="h-10 md:h-12 px-4 md:px-6 bg-cyan-500 text-black text-[10px] md:text-[11px] font-black uppercase tracking-tighter hover:bg-white transition-all shadow-[0_0_30px_rgba(0,255,255,0.4)] shrink-0 flex items-center gap-3 border-2 border-cyan-400 rounded-sm"
                                    >
                                        <UserPlus size={16} />
                                        <span className="hidden xs:inline">ADMIT {p.codename.split('-')[0]}</span>
                                        <span className="xs:hidden">{p.codename[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={endCall} aria-label="Leave Meeting" title="Leave Meeting" className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-white transition-all bg-white/[0.02] border border-white/5 hover:border-red-500/50">
                        <X size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative" onClick={() => { if (focusedPeerId) setFocusedPeerId(null); }}>
                {/* 1. Immersive Focused Peer Context (WhatsApp Style Remote) */}
                {focusedPeerId && (
                    <div className="absolute inset-0 z-0 bg-black overflow-hidden animate-in fade-in duration-500">
                         {(() => {
                             const focusedPeer = remotePeers.find(p => p.peerId === focusedPeerId);
                             return focusedPeer ? (
                                <VideoTile 
                                    stream={focusedPeer.stream} 
                                    role={focusedPeer.role} 
                                    codename={focusedPeer.codename} 
                                    isEnhanced={isEnhanced}
                                    isLowLight={isLowLight}
                                    onClick={() => setFocusedPeerId(null)}
                                />
                             ) : null;
                         })()}
                         {/* Ambient Vignette Overlay */}
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                    </div>
                )}

                <div className={`flex-1 p-4 md:p-6 flex flex-col items-center justify-center relative mesh-grid overflow-hidden transition-all duration-500 ${focusedPeerId ? 'bg-black/20 backdrop-blur-sm z-10' : ''}`}>
                    {!hasMediaAccess ? (
                        <div className="w-full max-w-lg bg-[#050505] border border-white/5 p-12 text-center shadow-2xl animate-in zoom-in-95 duration-500 relative z-10" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-4 mb-10">
                                <div className="w-16 h-16 bg-cyan-500/5 border border-cyan-500/10 rounded-sm flex items-center justify-center">
                                    {isConnecting ? <Loader2 size={24} className="text-cyan-500 animate-spin" /> : <Shield size={24} className="text-cyan-900" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-light uppercase tracking-tight text-white italic">Meeting Session 🐱</h2>
                                    <p className="text-[8px] font-black text-zinc-800 uppercase tracking-widest mt-1">Meeting ID: {roomId} 🐶</p>
                                </div>
                            </div>
                            <h3 className="text-2xl font-light uppercase tracking-tight text-white mb-2 italic">Security Clearance</h3>
                            <p className="text-[9px] font-black text-zinc-800 uppercase tracking-widest mb-10">Hardware Authorization Required for Production</p>
                            <div className="space-y-3 mb-12 text-left">
                                <PermissionToggle icon={<Mic size={14} />} label="Microphone Audio" desc="Encrypted voice circuit access" active={reqMic} onClick={() => setReqMic(!reqMic)} title="Microphone" />
                                <PermissionToggle icon={<VideoIcon size={14} />} label="Camera Feed" desc="Proprietary optical broadcast" active={reqCam} onClick={() => setReqCam(!reqCam)} title="Camera" />
                            </div>
                            {error && <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 text-red-500 text-[8px] font-black uppercase flex items-center gap-3"><AlertCircle size={14} /> {error}</div>}
                             <div className="grid grid-cols-2 gap-4">
                                <button onClick={authorizeAll} className="py-4 bg-white/[0.02] border border-white/5 text-zinc-500 text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">Authorize All</button>
                                <button onClick={initNode} disabled={isConnecting} className="py-4 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-cyan-400 transition-all shadow-[0_0_30px_rgba(0,229,255,0.2)] disabled:opacity-50">{isConnecting ? 'Initializing...' : 'Join Meeting'}</button>
                            </div>
                            <p className="mt-8 text-[7px] font-mono text-zinc-900 uppercase tracking-widest">SYSTEM: Peer signaling initiated on {localStorage.getItem('ghost_peer_host') || '0.peerjs.com'}.</p>
                        </div>
                    ) : !isAdmitted ? (
                        <div className="w-full max-w-md bg-[#050505] border border-white/10 p-12 text-center shadow-2xl relative z-20" 
                             onClick={() => getAudioCtx()} // Resume on lobby click
                        >
                             <div className="flex flex-col items-center gap-8">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border border-cyan-500/20 flex items-center justify-center animate-pulse">
                                        <Loader2 size={40} className="text-cyan-500 animate-spin" />
                                    </div>
                                    <div className="absolute inset-0 bg-cyan-500/5 filter blur-2xl rounded-full" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-light uppercase tracking-[0.2em] text-white italic">Lobby Area 🐈</h3>
                                    <p className="text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.4em] animate-pulse">Waiting for Admission... 🐕</p>
                                </div>
                                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                <p className="text-[8px] font-mono text-zinc-600 uppercase leading-relaxed max-w-[240px]">The host has been notified of your request. You will be automatically moved to the meeting once admitted.</p>
                             </div>
                        </div>
                    ) : (
                        <div className={`w-full h-full flex flex-col items-center justify-center relative`}>
                            {/* The Grid / Ribbon Switcher */}
                            <div 
                                onClick={(e) => e.stopPropagation()}
                                className={`w-full ${focusedPeerId ? 'flex overflow-x-auto gap-3 no-scrollbar absolute bottom-10 left-0 right-0 px-8 z-50 py-4' : `grid gap-4 md:gap-6 place-items-center transition-all duration-700 ${getGridCols()}`}`}
                            >
                                 
                                 {/* Self View: Floating Corner (WhatsApp Style) when someone is focused */}
                                 {myRole !== 'shadow' && (
                                    <div className={`${focusedPeerId ? 'fixed bottom-24 right-6 w-32 md:w-56 aspect-[9/16] md:aspect-video z-[100] shadow-[0_0_50px_rgba(0,0,0,0.9)] border-2 border-white/10 rounded-lg overflow-hidden animate-in slide-in-from-bottom-20 duration-500 cursor-move' : 'w-full'}`}>
                                        <VideoTile stream={localStreamRef.current} isMuted={true} isCameraOff={isCameraOff && !isScreenSharing} isLocal={true} isScreen={isScreenSharing} videoRef={localVideoRef} role={myRole} codename={myCodename} isEnhanced={isEnhanced} isLowLight={isLowLight} />
                                    </div>
                                )}

                                {/* Main Participant Grid / Ribbon */}
                                {remotePeers.filter((p) => p.role !== 'shadow' && p.peerId !== focusedPeerId).map((peer) => (
                                    <div key={peer.peerId} className={focusedPeerId ? 'shrink-0 w-24 md:w-44 opacity-80 hover:opacity-100 transition-all hover:scale-105' : 'w-full'}>
                                        <VideoTile 
                                            stream={peer.stream} 
                                            role={peer.role} 
                                            codename={peer.codename} 
                                            isEnhanced={isEnhanced} 
                                            onAddContact={() => addToContacts(peer.peerId, peer.codename)} 
                                            onKick={isHost ? () => kickPeer(peer.peerId) : undefined}
                                            onRefresh={() => connectToPeer(peer.peerId)}
                                            isLowLight={isLowLight} 
                                            onClick={() => setFocusedPeerId(peer.peerId)}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-12 flex flex-wrap justify-center gap-4">
                                {remotePeers.filter((p) => p.role === 'shadow').map((peer) => (
                                    <div key={peer.peerId} className="px-4 py-2 bg-black border border-white/5 flex items-center gap-3 opacity-40">
                                        <Eye size={12} className="text-zinc-600" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{peer.codename} (SHADOW)</span>
                                    </div>
                                ))}
                                {myRole === 'shadow' && (
                                    <div className="px-4 py-2 bg-black border border-cyan-500/20 flex items-center gap-3">
                                        <Eye size={12} className="text-cyan-500" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-cyan-500">{myCodename} (YOU)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {showChat && (
                    <aside className="w-80 bg-black/40 backdrop-blur-xl border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-300 z-[60] shadow-2xl">
                        <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                            <div className="flex items-center gap-3">
                                <MessageSquare size={14} className="text-cyan-500" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Secure Channel</span>
                            </div>
                            <button onClick={() => setShowChat(false)} className="text-zinc-500 hover:text-white transition-colors"><ChevronRight size={20} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar bg-gradient-to-b from-transparent to-black/20">
                            {messages.map((msg, idx) => {
                                const isSelf = msg.senderId.includes(peerRef.current?.id || '!!');
                                const isSystem = msg.senderId === 'SYSTEM';
                                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                
                                if (isSystem) {
                                    return (
                                        <div key={msg.id} className="flex justify-center my-2">
                                            <span className="px-4 py-1 rounded-full bg-white/[0.03] text-[8px] font-black text-zinc-600 uppercase tracking-widest border border-white/5">{msg.text}</span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {!isSelf && (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/5 shadow-lg" style={{ backgroundColor: getAvatarColor(msg.senderName) }}>
                                                <span className="text-[10px] font-black text-white">{msg.senderName.substring(0, 1)}</span>
                                            </div>
                                        )}
                                        <div className={`relative group max-w-[75%] px-3.5 py-2 rounded-2xl shadow-lg border ${isSelf ? 'bg-gradient-to-br from-cyan-600 to-cyan-800 border-cyan-500/30 text-white rounded-br-none' : 'bg-zinc-900/80 border-white/5 text-zinc-300 rounded-bl-none'}`}>
                                            {!isSelf && (
                                                <div className="text-[9px] font-black uppercase mb-1 opacity-80" style={{ color: getAvatarColor(msg.senderName) }}>
                                                    {msg.senderName}
                                                </div>
                                            )}
                                            <div className="text-[11px] leading-relaxed font-medium break-words">{msg.text}</div>
                                            <div className={`flex items-center justify-end gap-1 mt-1 opacity-40 group-hover:opacity-100 transition-opacity`}>
                                                <span className="text-[7px] font-mono">{timeStr}</span>
                                                {isSelf && <Check size={8} className="text-white/60" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 border-t border-white/10 bg-black/40">
                             {showEmojis && !isGuest && (
                                <div className="absolute bottom-full left-4 right-4 mb-2 p-3 bg-zinc-900 border border-white/10 grid grid-cols-5 gap-2 rounded-xl animate-in slide-in-from-bottom-2 duration-300 z-50 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                                    {EMOJIS.map(e => (
                                        <button key={e} onClick={() => { setChatInput(prev => prev + e); setShowEmojis(false); }} className="text-xl hover:scale-125 transition-transform p-2 hover:bg-white/5 rounded-lg">{e}</button>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl px-1 py-1 focus-within:border-cyan-500/50 transition-all">
                                <button onClick={() => setShowEmojis(!showEmojis)} className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${showEmojis ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-500 hover:text-white'}`}>👻</button>
                                <input 
                                    className="flex-1 bg-transparent py-2 px-2 text-[11px] text-white focus:outline-none placeholder:text-zinc-700" 
                                    placeholder={isGuest ? "READ_ONLY..." : "Message..."} 
                                    value={chatInput} 
                                    onChange={(e) => setChatInput(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
                                    disabled={isGuest}
                                />
                                <button onClick={sendMessage} disabled={isGuest || !chatInput.trim()} className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${chatInput.trim() ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]' : 'text-zinc-800'}`}>
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </aside>
                )}
            </main>

            {/* Modals */}
            {showSettings && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-[#050505] border border-white/10 p-8 shadow-2xl relative">
                        <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={18} /></button>
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white mb-8 italic">System Settings</h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Microphone Sensitivity</label>
                                <input type="range" min="0" max="200" value={micBoost} onChange={(e) => setMicBoost(Number(e.target.value))} className="w-full h-1 bg-white/5 accent-cyan-500" />
                                <div className="flex justify-between text-[6px] font-mono text-zinc-800 uppercase tracking-widest"><span>Standard</span><span>{micBoost}%</span></div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Speaker Volume</label>
                                <input type="range" min="0" max="200" value={speakerBoost} onChange={(e) => setSpeakerBoost(Number(e.target.value))} className="w-full h-1 bg-white/5 accent-cyan-500" />
                                <div className="flex justify-between text-[6px] font-mono text-zinc-800 uppercase tracking-widest"><span>Muted</span><span>{speakerBoost}%</span></div>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-white/[0.02] border border-white/5 text-zinc-500 text-[8px] font-black uppercase tracking-widest hover:text-white transition-all">Close Console</button>
                        </div>
                    </div>
                </div>
            )}

            {showBriefing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-[#050205] border border-white/10 p-8 shadow-2xl relative">
                        <button onClick={() => setShowBriefing(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={18} /></button>
                        <div className="flex items-center gap-4 mb-8">
                             <div className="w-10 h-10 bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center"><BookOpen size={18} className="text-cyan-500" /></div>
                             <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white italic">Meeting Notes</h3>
                        </div>
                        <textarea 
                            className="w-full h-64 bg-black/40 border border-white/5 p-6 text-[11px] text-zinc-400 font-mono leading-relaxed focus:outline-none focus:border-cyan-500/20 no-scrollbar resize-none"
                            placeholder="Enter session notes here. These are local to this terminal..."
                        />
                        <div className="mt-8 flex justify-between items-center text-[7px] font-mono text-zinc-800 uppercase tracking-widest">
                            <span>Local Buffer: 1024KB Available</span>
                            <button onClick={() => setShowBriefing(false)} className="text-cyan-500 hover:text-white transition-all underline decoration-dotted">Minimize Notes</button>
                        </div>
                    </div>
                </div>
            )}

            {hasMediaAccess && (
                <footer className="fixed bottom-0 left-0 right-0 bg-[var(--panel)]/90 backdrop-blur-3xl border-t border-[var(--border)] z-50 transition-all">
                    <div className="max-w-6xl mx-auto px-4 py-3 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Primary Controls */}
                        <div className="flex items-center gap-2 md:gap-4 order-2 md:order-1">
                            <div className="flex items-center gap-1 md:gap-4 bg-[var(--btn-bg)] p-1 md:p-2 border border-[var(--border)] rounded-sm">
                                <ControlBtn icon={isMuted ? <MicOff /> : <Mic />} active={isMuted} onClick={toggleMic} disabled={myRole === 'shadow'} title="Mute/Unmute" />
                                <ControlBtn icon={isCameraOff ? <VideoOff /> : <VideoIcon />} active={isCameraOff} onClick={toggleCam} disabled={myRole === 'shadow' || isScreenSharing} title="Camera On/Off" />
                            </div>

                            <div className="flex items-center gap-1 md:gap-4 bg-[var(--btn-bg)] p-1 md:p-2 border border-[var(--border)] rounded-sm">
                                <ControlBtn icon={isScreenSharing ? <MonitorOff /> : <MonitorUp />} active={isScreenSharing} onClick={toggleScreenShare} disabled={myRole === 'shadow'} title="Screen Share" className="hidden sm:flex" />
                                <div className="relative">
                                    <ControlBtn icon={<MessageSquare />} active={showChat} onClick={() => { setShowChat(!showChat); setUnreadCount(0); }} title="Chat" />
                                    {unreadCount > 0 && !showChat && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center border-2 border-black animate-bounce shadow-[0_0_15px_rgba(220,38,38,0.5)] z-[60]">
                                            <span className="text-[10px] font-black text-white">{unreadCount}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* End Meeting Button (Centered or Right) */}
                        <div className="order-1 md:order-2">
                             <button onClick={endCall} title="End Meeting" className="px-6 md:px-10 py-3 md:py-4 bg-red-600 text-white flex items-center justify-center gap-3 hover:bg-red-500 transition-all rounded-sm shadow-[0_0_40px_rgba(220,38,38,0.2)] active:scale-95 group font-black uppercase text-[9px] md:text-[10px] tracking-widest">
                                <PhoneOff size={16} className="group-hover:rotate-12 transition-transform" />
                                <span>Leave Meeting</span>
                             </button>
                        </div>

                        {/* Secondary Desktop Controls */}
                        <div className="hidden lg:flex items-center gap-4 order-3">
                            <ControlBtn icon={isLowLight ? <Sun /> : <Moon />} active={isLowLight} onClick={() => setIsLowLight(!isLowLight)} title="Low Light Boost" />
                            <ControlBtn icon={<BookOpen />} active={showBriefing} onClick={() => setShowBriefing(true)} />
                            <ControlBtn icon={<Settings />} active={showSettings} onClick={() => setShowSettings(!showSettings)} />
                            <div className="flex border-l border-[var(--border)] ml-2 pl-4 gap-4 items-center">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[6px] font-black text-[var(--subtext)] uppercase">Audio Out</span>
                                    <input type="range" min="100" max="200" value={speakerBoost} onChange={(e) => setSpeakerBoost(Number(e.target.value))} className="w-16 accent-[var(--accent)]" />
                                </div>
                                <button onClick={() => setIsEnhanced(!isEnhanced)} className={`px-2 py-1 text-[7px] font-black uppercase tracking-widest border transition-all ${isEnhanced ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'text-[var(--subtext)] border-[var(--border)] bg-[var(--btn-bg)]'}`}>HD Mode</button>
                            </div>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
};

interface ControlBtnProps { icon: React.ReactNode; active?: boolean; onClick: () => void; disabled?: boolean; }

export default MeetCall;
