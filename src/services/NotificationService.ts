import emailjs from '@emailjs/browser';
import type { SystemLog } from './LoggingService';

// Initialize with a placeholder or empty string.
// The user needs to set these in their .env file.
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export class NotificationService {
    static isConfigured(): boolean {
        return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
    }

    static async notifyAdmin(subject: string, message: string, data?: any) {
        if (!this.isConfigured()) {
            console.warn('EmailJS is not configured. Notification skipped:', subject);
            return;
        }

        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    to_name: 'Infrastructure Admin',
                    subject: `[GHOSTS ALERT] ${subject}`,
                    message: message,
                    metadata: data ? JSON.stringify(data, null, 2) : 'No additional metadata.',
                    timestamp: new Date().toISOString(),
                },
                EMAILJS_PUBLIC_KEY
            );
            console.log('Admin notification sent successfully.');
        } catch (error) {
            console.error('Failed to send admin notification:', error);
        }
    }

    static async notifyNewNodeRegistration(username: string, name: string) {
        await this.notifyAdmin(
            'New Node Registration',
            `A new node has been registered on the GHOSTS network.`,
            { username, name }
        );
    }

    static async notifyMeshSyncFailure(errorDetails: string) {
        await this.notifyAdmin(
            'CRITICAL: Mesh Sync Failure',
            `A node reported a failure while synchronizing with the global mesh.`,
            { error: errorDetails }
        );
    }
}
