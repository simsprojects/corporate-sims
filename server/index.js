import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVER, GAME } from './config.js';
import { Database } from './persistence/Database.js';
import { SocketHandler } from './network/SocketHandler.js';
import { GameRoom } from './game/GameRoom.js';
import { createAuthRouter } from './api/auth.js';
import { createRoomsRouter } from './api/rooms.js';
import { createLeaderboardRouter } from './api/leaderboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ========== Express + Socket.io Setup ==========

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
    cors: { origin: '*' },
    pingInterval: 10000,
    pingTimeout: 5000
});

// ========== Database ==========

const db = new Database();
await db.init();
db.migrate();

// Clean expired sessions on startup
db.cleanExpiredSessions();

// ========== Middleware ==========

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

// ========== Active Game Rooms ==========

const activeRooms = new Map();

function getOrCreateRoom(roomId) {
    if (!activeRooms.has(roomId)) {
        const room = new GameRoom(roomId);
        room.start();
        activeRooms.set(roomId, room);

        room.on('empty', () => {
            setTimeout(() => {
                if (room.playerCount === 0) {
                    room.stop();
                    activeRooms.delete(roomId);
                    console.log(`[Server] Room "${roomId}" destroyed (empty)`);
                }
            }, GAME.EMPTY_ROOM_TTL);
        });

        console.log(`[Server] Room "${roomId}" created (${activeRooms.size} total)`);
    }
    return activeRooms.get(roomId);
}

// ========== REST API ==========

app.use('/api/auth', createAuthRouter(db));
app.use('/api/rooms', createRoomsRouter(activeRooms));
app.use('/api/leaderboard', createLeaderboardRouter(db));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        rooms: activeRooms.size,
        uptime: Math.round(process.uptime())
    });
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ========== Socket.io ==========

const socketHandler = new SocketHandler(io, getOrCreateRoom);
socketHandler.init();

// ========== Start Server ==========

const PORT = SERVER.PORT;
httpServer.listen(PORT, () => {
    console.log('');
    console.log('  ╔═══════════════════════════════════════════════╗');
    console.log('  ║   🎬 Hard Workers Finish Last — Server        ║');
    console.log(`  ║   Running on http://localhost:${PORT}             ║`);
    console.log('  ║   Multiplayer Corporate Simulation             ║');
    console.log('  ╚═══════════════════════════════════════════════╝');
    console.log('');
});

// ========== Graceful Shutdown ==========

process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    for (const [, room] of activeRooms) {
        room.stop();
    }
    db.close();
    httpServer.close();
    process.exit(0);
});
