export interface SystemLog {
    event: string;
    data: any;
    timestamp: number;
    meetingId?: string;
    user?: string;
}

export class LoggingService {
    private static MAX_METADATA_DAYS = 180;
    private static MAX_EVENT_DAYS = 30;

    static logEvent(event: string, data: any) {
        const logEntry: SystemLog = {
            event,
            data,
            timestamp: Date.now(),
            meetingId: data.meetingId,
            user: data.user || data.host
        };

        const savedLogs = this.getLogs();
        savedLogs.push(logEntry);

        // Apply retention policy
        const purifiedLogs = this.applyRetention(savedLogs);
        localStorage.setItem('ghost_system_logs', JSON.stringify(purifiedLogs));
    }

    private static applyRetention(logs: SystemLog[]): SystemLog[] {
        const now = Date.now();
        const metadataCutoff = now - (this.MAX_METADATA_DAYS * 24 * 60 * 60 * 1000);
        const eventCutoff = now - (this.MAX_EVENT_DAYS * 24 * 60 * 60 * 1000);

        return logs.filter(log => {
            // Administrative metadata (meetings) retained for 180 days
            if (['meeting_created', 'meeting_ended'].includes(log.event)) {
                return log.timestamp > metadataCutoff;
            }
            // General events retained for 30 days
            return log.timestamp > eventCutoff;
        });
    }

    static getLogs(): SystemLog[] {
        try {
            return JSON.parse(localStorage.getItem('ghost_system_logs') || '[]');
        } catch (e) {
            return [];
        }
    }

    static getInteractionMap() {
        const logs = this.getLogs();
        const interactions: Record<string, Set<string>> = {};

        logs.forEach(log => {
            if (log.event === 'participant_joined' && log.meetingId) {
                const meeting = logs.find(l => l.event === 'meeting_created' && l.meetingId === log.meetingId);
                if (meeting && meeting.user && log.user && meeting.user !== log.user) {
                    if (!interactions[meeting.user]) interactions[meeting.user] = new Set<string>();
                    interactions[meeting.user]!.add(log.user);
                }
            }
        });

        // Convert Sets back to Arrays for storage/transfer
        return Object.keys(interactions).map(user => ({
            user,
            connected_with: Array.from(interactions[user]!)
        }));
    }
}
