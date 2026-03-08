export interface Tab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
}

export interface VpnLocation {
  id: string;
  name: string;
  country: string;
  latency: number;
  flag: string;
  ip: string;
}

export type NodeRole = 'origin' | 'node' | 'shadow';

export enum RoutingMode {
  NORMAL = 'DIRECT',
  VPN = 'TUNNEL'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Participant {
  id: string;
  name: string;
  type: 'alpha' | 'delta' | 'gamma' | 'omega';
  status: 'connected' | 'handshaking' | 'disconnected';
  latency: number;
  isLocal?: boolean;
  role: NodeRole;
  codename: string;
  permissions: {
    canSpeak: boolean;
    canBroadcast: boolean; // Camera
    canShare: boolean; // Screen
  };
}

export enum CallStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED'
}
export type SearchEngine = 'DUCKDUCKGO' | 'GHOST_INTEL' | 'GOOGLE' | 'BING';

export type MailFolder = 'inbox' | 'sent' | 'drafts' | 'trash';

export interface GhostEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
  folder: MailFolder;
}
