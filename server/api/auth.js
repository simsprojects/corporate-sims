import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { SERVER } from '../config.js';

const router = Router();
const SALT_ROUNDS = 10;

/**
 * Auth API routes.
 * Uses session tokens stored in SQLite.
 */
export function createAuthRouter(db) {

    // POST /api/auth/register
    router.post('/register', async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters' });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        // Check if exists
        const existing = db.getPlayerByUsername(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        const playerId = nanoid(12);
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        db.createPlayer(playerId, username, hashedPassword);
        db.ensurePlayerStats(playerId);

        // Create session
        const token = nanoid(32);
        const expiresAt = Math.floor(Date.now() / 1000) + Math.floor(SERVER.SESSION_TTL / 1000);
        db.createSession(token, playerId, expiresAt);

        res.status(201).json({
            token,
            player: { id: playerId, username }
        });
    });

    // POST /api/auth/login
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const player = db.getPlayerByUsername(username);
        if (!player) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, player.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        db.updateLastLogin(player.id);

        const token = nanoid(32);
        const expiresAt = Math.floor(Date.now() / 1000) + Math.floor(SERVER.SESSION_TTL / 1000);
        db.createSession(token, player.id, expiresAt);

        res.json({
            token,
            player: { id: player.id, username: player.username }
        });
    });

    // POST /api/auth/logout
    router.post('/logout', (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            db.deleteSession(token);
        }
        res.json({ ok: true });
    });

    // GET /api/auth/me
    router.get('/me', (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Not authenticated' });

        const session = db.getSession(token);
        if (!session) return res.status(401).json({ error: 'Session expired' });

        const player = db.getPlayerById(session.player_id);
        if (!player) return res.status(401).json({ error: 'Player not found' });

        res.json({
            player: { id: player.id, username: player.username }
        });
    });

    return router;
}
