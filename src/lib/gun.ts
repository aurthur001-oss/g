import Gun from 'gun';
import 'gun/sea';
import 'gun/axe';

// Initialize Gun with some public relay peers for global discovery
// In production, you might want to run your own relay node
export const gun = Gun({
    peers: [
        'https://gun-manhattan.herokuapp.com/gun',
        'https://relay.peer.ooo/gun'
    ]
});

// Root nodes for GHOSTS infrastructure
export const meshNodes = gun.get('ghosts_infrastructure_v2').get('nodes');
export const meshEvents = gun.get('ghosts_infrastructure_v2').get('events');
