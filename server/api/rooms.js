import { Router } from 'express';
import { GAME } from '../config.js';

/**
 * Room management API routes.
 */
export function createRoomsRouter(activeRooms) {

    const router = Router();

    // GET /api/rooms — list active rooms
    router.get('/', (req, res) => {
        const rooms = [];
        for (const [id, room] of activeRooms) {
            rooms.push({
                id,
                playerCount: room.playerCount,
                maxPlayers: GAME.MAX_PLAYERS_PER_ROOM,
                day: room.gameState.day,
                time: Math.round(room.gameState.time)
            });
        }
        res.json({ rooms });
    });

    // GET /api/rooms/:id — room details
    router.get('/:id', (req, res) => {
        const room = activeRooms.get(req.params.id);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json({
            id: room.id,
            playerCount: room.playerCount,
            maxPlayers: GAME.MAX_PLAYERS_PER_ROOM,
            day: room.gameState.day,
            time: Math.round(room.gameState.time),
            characters: Array.from(room.characters.values()).map(c => ({
                id: c.id, name: c.name, role: c.role, isPlayer: c.isPlayer
            }))
        });
    });

    return router;
}
