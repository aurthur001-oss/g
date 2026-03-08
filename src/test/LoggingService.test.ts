import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoggingService } from '../services/LoggingService';

describe('LoggingService', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should log an event and persist it in localStorage', () => {
        LoggingService.logEvent('test_event', { key: 'value' });
        const logs = LoggingService.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].event).toBe('test_event');
        expect(logs[0].data.key).toBe('value');
    });

    it('should apply retention policy for general events (30 days)', () => {
        const now = Date.now();
        const oldTimestamp = now - (31 * 24 * 60 * 60 * 1000); // 31 days ago

        const oldLog = { event: 'general_event', data: {}, timestamp: oldTimestamp };
        localStorage.setItem('ghost_system_logs', JSON.stringify([oldLog]));

        LoggingService.logEvent('new_event', {});
        const logs = LoggingService.getLogs();

        expect(logs).toHaveLength(1);
        expect(logs[0].event).toBe('new_event');
    });

    it('should retain administrative metadata for 180 days', () => {
        const now = Date.now();
        const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

        const meetingLog = { event: 'meeting_created', data: { meetingId: 'M1' }, timestamp: ninetyDaysAgo };
        localStorage.setItem('ghost_system_logs', JSON.stringify([meetingLog]));

        LoggingService.logEvent('new_event', {});
        const logs = LoggingService.getLogs();

        expect(logs).toContainEqual(expect.objectContaining({ event: 'meeting_created' }));
        expect(logs).toHaveLength(2);
    });

    it('should generate an interaction map correctly', () => {
        const logs = [
            { event: 'meeting_created', data: { host: 'ALICE' }, user: 'ALICE', meetingId: 'M1', timestamp: Date.now() },
            { event: 'participant_joined', data: { user: 'BOB' }, user: 'BOB', meetingId: 'M1', timestamp: Date.now() },
            { event: 'participant_joined', data: { user: 'CHARLIE' }, user: 'CHARLIE', meetingId: 'M1', timestamp: Date.now() }
        ];
        localStorage.setItem('ghost_system_logs', JSON.stringify(logs));

        const map = LoggingService.getInteractionMap();
        const aliceInteractions = map.find(m => m.user === 'ALICE');

        expect(aliceInteractions).toBeDefined();
        expect(aliceInteractions?.connected_with).toContain('BOB');
        expect(aliceInteractions?.connected_with).toContain('CHARLIE');
    });
});
