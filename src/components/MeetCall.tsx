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
    UserPlus,
    Sun,
    Moon
} from 'lucide-react';
import Peer, { type DataConnection } from 'peerjs';
import { Logo } from './Logo';
import type { NodeRole, ChatMessage } from '../types';
import { supabase, isCloudBackupActive } from '../lib/supabase';

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
}

// --- Helper Components (Hoisted to avoid TDZ) ---

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

function VideoTile({ stream, isMuted, isCameraOff, isLocal, isScreen, videoRef: externalVideoRef, role, codename, isEnhanced, onAddContact, isLowLight }: VideoTileProps & { isLowLight?: boolean }) {
    const internalVideoRef = useRef<HTMLVideoElement>(null);
    const videoRef = externalVideoRef || internalVideoRef;
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream) return;
        
        const attemptPlay = async () => {
            try {
                if (video.srcObject !== stream) video.srcObject = stream;
                await video.play();
            } catch (e) {
                console.warn('Mobile Autoplay Blocked - Waiting for interaction:', e);
            }
        };
        
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
            onClick={handleManualPlay}
            className="relative w-full aspect-video bg-[#050505] border border-white/[0.05] rounded-sm overflow-hidden group shadow-2xl flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
        >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted={isLocal || isMuted} 
              style={{ filter: isLowLight ? 'brightness(1.5) contrast(1.2) saturate(1.1)' : (isEnhanced ? 'brightness(1.1) contrast(1.1) saturate(1.2)' : 'none') }} 
              className={`w-full h-full ${isScreen ? 'object-contain bg-black' : 'object-cover'} transition-all duration-1000 ${isLocal && !isScreen ? 'scale-x-[-1]' : ''} ${isCameraOff ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`} 
            />
            
            {!isLocal && !isCameraOff && (
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
    const [showEmojis, setShowEmojis] = useState(false);
    const EMOJIS = ['👻', '✨', '💎', '🔥', '🚀', '🔒', '🦾', '🎯', '⚡', '🛸'];

    const peerRef = useRef<Peer | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const callsRef = useRef<Map<string, any>>(new Map());
    const dataConnsRef = useRef<Map<string, DataConnection>>(new Map());
    const chatEndRef = useRef<HTMLDivElement>(null);

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
            const allAudios = document.querySelectorAll('video');
            allAudios.forEach(v => {
                if (v.paused && v.srcObject) v.play().catch(() => {});
            });
            // We can't easily access the component's audioCtx from here, 
            // but the VideoTile click handler will take care of it too.
        };
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    useEffect(() => {
        const handleUnload = () => {
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            screenStreamRef.current?.getTracks().forEach((t) => t.stop());
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
                    video: reqCam ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
                    audio: reqMic
                });
                
                // Replace tracks in all active calls
                const videoTrack = newStream.getVideoTracks()[0];
                const audioTrack = newStream.getAudioTracks()[0];
                
                await replaceTrackInCalls(videoTrack);
                // Note: PeerJS audio track replacement is more complex, 
                // but usually handled by stream answer.
                
                localStreamRef.current = newStream;
                if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
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
                          console.log(`[SIGNALING] Discovery (INSERT): ${newPeerId}`);
                          connectToPeer(newPeerId);
                      }
                  })
                  .subscribe();

              // B. Initial Discovery: Fetch EXISTING peers immediately
              resyncRoom();

              // C. Active Meeting Registry (Host Only)
              if (isHost || myRole === 'origin') {
                  const registerMeeting = async () => {
                      await (supabase as any).from('active_meetings').upsert({
                          room_id: roomId,
                          host_name: userName || myCodename,
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
                        video: reqCam ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
                        audio: reqMic
                    });
                    setIsMuted(!reqMic);
                    setIsCameraOff(!reqCam);
                }
            }

            localStreamRef.current = stream;
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
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:stun3.l.google.com:19302' },
                        { urls: 'stun:stun4.l.google.com:19302' },
                        // TURN Server for Mobile/NAT Traversal (REQUIRED for cross-network calls)
                        // {
                        //     urls: 'turn:your-turn-server.com:3478',
                        //     username: 'your-username',
                        //     credential: 'your-password'
                        // }
                    ]
                }
            });
            peerRef.current = peer;

            peer.on('open', () => {
                setIsConnecting(false);
                setStatusMsg(`Meeting Live: ${roomId}`);
                addSystemMessage(`${myCodename.toUpperCase()} JOINED THE MEETING`);
                
                // Reliable Signaling Fallback: Register presence in Supabase
                if (isCloudBackupActive()) {
                    (supabase as any).from('meeting_signaling').insert({
                        room_id: roomId,
                        peer_id: myId
                    });
                }
                
                if (myRole !== 'origin' && externalRoomId) {
                    const hostId = `GHOST-CONF-${roomId}-HOST`;
                    connectToPeer(hostId);
                }
            });

            peer.on('connection', (conn) => setupDataConnection(conn));

            peer.on('call', (call) => {
                const streamToSend =
                    isScreenSharing && screenStreamRef.current
                        ? screenStreamRef.current
                        : localStreamRef.current!;
                call.answer(streamToSend);
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
            } else if (data.type === 'PEER_DISCOVERY') {
                // Staggered discovery to prevent signaling storm
                const delay = Math.floor(Math.random() * 1500);
                setTimeout(() => {
                    connectToPeer(data.targetPeerId);
                }, delay);
            }
        });
        conn.on('close', () => dataConnsRef.current.delete(conn.peer));
    };

    const updatePeerCodename = (peerId: string, codename: string, role: NodeRole) => {
        setRemotePeers((prev) => prev.map((p) => (p.peerId === peerId ? { ...p, codename, role } : p)));
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
        if (peerRef.current.id < targetId) {
            console.log(`[SIGNALING] Passive discovery for ${targetId} (waiting for incoming call)`);
            return;
        }

        // Staggered connection for 20+ users
        const delay = retryCount === 0 ? Math.floor(Math.random() * 2000) : 0;
        
        setTimeout(() => {
            try {
                const conn = peerRef.current!.connect(targetId, { reliable: true });
                setupDataConnection(conn);
                const streamToSend =
                    isScreenSharing && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current;
                const call = peerRef.current!.call(targetId, streamToSend!);
                
                if (call) {
                    call.on('stream', (remoteStream) => {
                        handleRemoteStream(targetId, remoteStream);
                    });
                    
                    call.on('error', (err) => {
                        console.error(`Peer ${targetId} handshake failed:`, err);
                        if (retryCount < 2) setTimeout(() => connectToPeer(targetId, retryCount + 1), 3000);
                    });
                    call.on('close', () => removePeer(targetId));
                    callsRef.current.set(targetId, call);
                }
            } catch (err) {
                console.error(`Target ${targetId} unreachable:`, err);
            }
        }, delay);
    };

    const handleRemoteStream = (peerId: string, stream: MediaStream) => {
        const parts = peerId.split('-');
        const role: NodeRole = peerId.includes('-shadow-') || peerId.includes('-SHADOW-') ? 'shadow' : peerId.includes('-HOST') ? 'origin' : 'node';
        
        // Bandwidth protection for 20+ participants
        // If more than 8 users, we keep new video off to save CPU/Network
        const autoOff = remotePeers.length > 8;
        
        setRemotePeers((prev) => {
            if (prev.find((p) => p.peerId === peerId)) {
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

    const removePeer = (peerId: string) => {
        const peer = remotePeers.find((p) => p.peerId === peerId);
        if (peer) addSystemMessage(`USER ${peer.codename} DISCONNECTED`);
        setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
        callsRef.current.delete(peerId);
        dataConnsRef.current.delete(peerId);
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
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const encodedRoom = encodeURIComponent(externalRoomId || roomId);
        const encodedHost = encodeURIComponent(userName);
        const url = `${baseUrl}?room=${encodedRoom}&host=${encodedHost}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                    <button onClick={copyInvite} className="p-2.5 md:px-5 md:py-2.5 border border-white/5 bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white hover:border-cyan-500/30 transition-all flex items-center gap-3">
                        {copied ? <Check size={14} className="text-cyan-500" /> : <LinkIcon size={14} />}
                        <span className="hidden md:inline">{copied ? 'LINK COPIED' : `INVITE LINK`}</span>
                    </button>

                    <button onClick={endCall} aria-label="Leave Meeting" title="Leave Meeting" className="w-10 h-10 flex items-center justify-center text-zinc-800 hover:text-white transition-all bg-white/[0.02] border border-white/5 hover:border-red-500/50">
                        <X size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 p-6 flex flex-col items-center justify-center relative mesh-grid overflow-hidden">
                    {!hasMediaAccess ? (
                        <div className="w-full max-w-lg bg-[#050505] border border-white/5 p-12 text-center shadow-2xl animate-in zoom-in-95 duration-500 relative z-10">
                            <div className="flex items-center justify-center gap-4 mb-10">
                                <div className="w-16 h-16 bg-cyan-500/5 border border-cyan-500/10 rounded-sm flex items-center justify-center">
                                    {isConnecting ? <Loader2 size={24} className="text-cyan-500 animate-spin" /> : <Shield size={24} className="text-cyan-900" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-light uppercase tracking-tight text-white italic">Meeting Session</h2>
                                    <p className="text-[8px] font-black text-zinc-800 uppercase tracking-widest mt-1">Meeting ID: {roomId}</p>
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
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center relative">
                            <div className={`w-full grid gap-6 transition-all duration-700 place-items-center ${getGridCols()}`}>
                                 {myRole !== 'shadow' && (
                                    <VideoTile stream={localStreamRef.current} isMuted={true} isCameraOff={isCameraOff && !isScreenSharing} isLocal={true} isScreen={isScreenSharing} videoRef={localVideoRef} role={myRole} codename={myCodename} isEnhanced={isEnhanced} isLowLight={isLowLight} />
                                )}
                                {remotePeers.filter((p) => p.role !== 'shadow').map((peer) => (
                                    <VideoTile key={peer.peerId} stream={peer.stream} role={peer.role} codename={peer.codename} isEnhanced={isEnhanced} onAddContact={() => addToContacts(peer.peerId, peer.codename)} isLowLight={isLowLight} />
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
                    <aside className="w-80 bg-[#020202] border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-300 z-[60]">
                        <div className="h-14 px-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <MessageSquare size={14} className="text-cyan-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">Chat</span>
                            </div>
                            <button onClick={() => setShowChat(false)} className="text-zinc-800 hover:text-white"><ChevronRight size={18} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.senderId === 'SYSTEM' ? 'items-center' : msg.senderId.includes(peerRef.current?.id || '!!') ? 'items-end' : 'items-start'}`}>
                                    {msg.senderId !== 'SYSTEM' && <span className="text-[7px] font-black text-zinc-700 uppercase mb-1">{msg.senderName}</span>}
                                    <div className={`px-3 py-2 text-[10px] font-mono leading-relaxed max-w-[90%] rounded-sm ${msg.senderId === 'SYSTEM' ? 'text-zinc-500 text-[8px] tracking-widest py-4' : msg.senderId.includes(peerRef.current?.id || '!!') ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-white/[0.02] border border-white/5 text-zinc-400'}`}>{msg.text}</div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-4 border-t border-white/5 space-y-3 relative">
                            {showEmojis && !isGuest && (
                                <div className="absolute bottom-full left-0 right-0 p-3 bg-black border border-white/5 grid grid-cols-5 gap-2 animate-in slide-in-from-bottom-2 duration-300 z-50 shadow-2xl">
                                    {EMOJIS.map(e => (
                                        <button key={e} onClick={() => { setChatInput(prev => prev + e); setShowEmojis(false); }} className="text-xl hover:scale-125 transition-transform p-2 bg-white/[0.02] border border-white/5 hover:border-cyan-500/20">{e}</button>
                                    ))}
                                </div>
                            )}
                            <div className="relative flex gap-2">
                                <input 
                                    className="flex-1 bg-[#050505] border border-white/10 py-3 pl-4 pr-10 text-[10px] text-white focus:outline-none focus:border-cyan-500/30 font-mono italic" 
                                    placeholder={isGuest ? "GUEST_READ_ONLY..." : "MSG_UPLINK..."} 
                                    value={chatInput} 
                                    onChange={(e) => setChatInput(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
                                    disabled={isGuest}
                                />
                                {!isGuest && (
                                    <button onClick={() => setShowEmojis(!showEmojis)} className={`w-10 h-10 flex items-center justify-center border border-white/5 hover:border-cyan-500/20 transition-all ${showEmojis ? 'bg-cyan-500 text-black' : 'text-zinc-600'}`}>👻</button>
                                )}
                                <button onClick={sendMessage} disabled={isGuest} className={`text-zinc-700 hover:text-cyan-500 transition-colors ${isGuest ? 'opacity-0 pointer-events-none' : ''}`}><Send size={14} /></button>
                            </div>
                        </div>
                    </aside>
                )}
            </main>

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
                                <button onClick={() => setIsEnhanced(!isEnhanced)} className={`px-2 py-1 text-[7px] font-black uppercase tracking-widest border transition-all ${isEnhanced ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'text-[var(--subtext)] border-[var(--border)] bg-[var(--btn-bg)]'}`}>Elite Mode</button>
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
