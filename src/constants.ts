import type { VpnLocation, Tab } from './types';

export const VPN_LOCATIONS: VpnLocation[] = [
    {
        id: 'node-01',
        name: 'Zurich Center',
        country: 'Switzerland',
        latency: 12,
        flag: '🇨🇭',
        ip: '141.142.0.1'
    },
    {
        id: 'node-02',
        name: 'Reykjavik Vault',
        country: 'Iceland',
        latency: 8,
        flag: '🇮🇸',
        ip: '185.112.5.22'
    },
    {
        id: 'node-03',
        name: 'Tokyo Mesh',
        country: 'Japan',
        latency: 24,
        flag: '🇯🇵',
        ip: '203.10.99.81'
    },
    {
        id: 'node-04',
        name: 'Singapore Link',
        country: 'Singapore',
        latency: 15,
        flag: '🇸🇬',
        ip: '101.55.12.4'
    },
    {
        id: 'node-05',
        name: 'Vancouver Crypt',
        country: 'Canada',
        latency: 19,
        flag: '🇨🇦',
        ip: '66.199.1.50'
    }
];

export const INITIAL_TABS: Tab[] = [
    {
        id: 't-1',
        title: 'DASHBOARD',
        url: 'internal://home',
        history: ['internal://home'],
        historyIndex: 0
    }
];
