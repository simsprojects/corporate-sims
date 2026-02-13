import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'game.db');

/**
 * SQLite database wrapper using sql.js (pure JavaScript — no native compilation).
 * sql.js loads the entire DB into memory and saves to disk on writes.
 */
export class Database {
    constructor() {
        this.db = null;
        this._ready = false;
    }

    async init() {
        const SQL = await initSqlJs();

        // Load existing DB file if it exists
        if (fs.existsSync(DB_PATH)) {
            const buffer = fs.readFileSync(DB_PATH);
            this.db = new SQL.Database(buffer);
        } else {
            this.db = new SQL.Database();
        }

        this._ready = true;
        console.log('[DB] sql.js initialized');
    }

    _save() {
        if (!this.db) return;
        const data = this.db.export();
        const buffer = Buffer.from(data);
        // Ensure directory exists
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DB_PATH, buffer);
    }

    migrate() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS players (
                id          TEXT PRIMARY KEY,
                username    TEXT UNIQUE NOT NULL,
                password    TEXT NOT NULL,
                created_at  INTEGER DEFAULT (strftime('%s','now')),
                last_login  INTEGER
            )
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                token       TEXT PRIMARY KEY,
                player_id   TEXT NOT NULL,
                created_at  INTEGER DEFAULT (strftime('%s','now')),
                expires_at  INTEGER NOT NULL
            )
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS characters (
                id          TEXT PRIMARY KEY,
                player_id   TEXT NOT NULL,
                name        TEXT NOT NULL,
                role        TEXT NOT NULL,
                appearance  TEXT NOT NULL,
                personality TEXT NOT NULL,
                created_at  INTEGER DEFAULT (strftime('%s','now'))
            )
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS rooms (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                created_by  TEXT,
                max_players INTEGER DEFAULT 8,
                is_active   INTEGER DEFAULT 1,
                created_at  INTEGER DEFAULT (strftime('%s','now'))
            )
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS player_stats (
                player_id           TEXT PRIMARY KEY,
                total_slack_pts     INTEGER DEFAULT 0,
                total_weeks         INTEGER DEFAULT 0,
                best_week_score     INTEGER DEFAULT 0,
                total_coffee        INTEGER DEFAULT 0,
                total_meetings_dodged INTEGER DEFAULT 0,
                highest_rank        TEXT DEFAULT 'Warm Body'
            )
        `);

        // Indexes
        this._execSafe('CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions(player_id)');
        this._execSafe('CREATE INDEX IF NOT EXISTS idx_characters_player ON characters(player_id)');
        this._execSafe('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)');

        this._save();
        console.log('[DB] Migration complete');
    }

    _execSafe(sql) {
        try { this.db.run(sql); } catch (e) { /* index may already exist */ }
    }

    _getOne(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    }

    _getAll(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    }

    _run(sql, params = []) {
        this.db.run(sql, params);
        this._save();
    }

    // ========== PLAYERS ==========

    createPlayer(id, username, hashedPassword) {
        this._run('INSERT INTO players (id, username, password) VALUES (?, ?, ?)', [id, username, hashedPassword]);
    }

    getPlayerByUsername(username) {
        return this._getOne('SELECT * FROM players WHERE username = ?', [username]);
    }

    getPlayerById(id) {
        return this._getOne('SELECT * FROM players WHERE id = ?', [id]);
    }

    updateLastLogin(playerId) {
        this._run("UPDATE players SET last_login = strftime('%s','now') WHERE id = ?", [playerId]);
    }

    // ========== SESSIONS ==========

    createSession(token, playerId, expiresAt) {
        this._run('INSERT INTO sessions (token, player_id, expires_at) VALUES (?, ?, ?)', [token, playerId, expiresAt]);
    }

    getSession(token) {
        const now = Math.floor(Date.now() / 1000);
        return this._getOne('SELECT * FROM sessions WHERE token = ? AND expires_at > ?', [token, now]);
    }

    deleteSession(token) {
        this._run('DELETE FROM sessions WHERE token = ?', [token]);
    }

    cleanExpiredSessions() {
        const now = Math.floor(Date.now() / 1000);
        this._run('DELETE FROM sessions WHERE expires_at <= ?', [now]);
    }

    // ========== CHARACTERS ==========

    saveCharacter(id, playerId, name, role, appearance, personality) {
        this._run(
            'INSERT OR REPLACE INTO characters (id, player_id, name, role, appearance, personality) VALUES (?, ?, ?, ?, ?, ?)',
            [id, playerId, name, role, JSON.stringify(appearance), JSON.stringify(personality)]
        );
    }

    getPlayerCharacters(playerId) {
        return this._getAll('SELECT * FROM characters WHERE player_id = ?', [playerId])
            .map(row => ({
                ...row,
                appearance: JSON.parse(row.appearance),
                personality: JSON.parse(row.personality)
            }));
    }

    // ========== STATS ==========

    ensurePlayerStats(playerId) {
        const existing = this._getOne('SELECT player_id FROM player_stats WHERE player_id = ?', [playerId]);
        if (!existing) {
            this._run('INSERT INTO player_stats (player_id) VALUES (?)', [playerId]);
        }
    }

    updatePlayerStats(playerId, weekStats) {
        this.ensurePlayerStats(playerId);

        this._run(`
            UPDATE player_stats SET
                total_slack_pts = total_slack_pts + ?,
                total_weeks = total_weeks + 1,
                best_week_score = MAX(best_week_score, ?),
                total_coffee = total_coffee + ?,
                total_meetings_dodged = total_meetings_dodged + ?
            WHERE player_id = ?
        `, [
            weekStats.slackPoints,
            weekStats.slackPoints,
            weekStats.coffeeDrunk,
            weekStats.meetingsAvoided,
            playerId
        ]);
    }

    getLeaderboard(limit = 20) {
        return this._getAll(`
            SELECT ps.*, p.username
            FROM player_stats ps
            JOIN players p ON p.id = ps.player_id
            ORDER BY ps.total_slack_pts DESC
            LIMIT ?
        `, [limit]);
    }

    close() {
        if (this.db) {
            this._save();
            this.db.close();
        }
    }
}
