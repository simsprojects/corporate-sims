// Server and game configuration constants
// Tuned for lightweight operation on consumer hardware

export const SERVER = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-change-me',
    SESSION_TTL: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const TICK = {
    RATE: 10,                  // 10 ticks/sec (lighter than 20, still smooth)
    INTERVAL: 1000 / 10,      // 100ms per tick
    SNAPSHOT_INTERVAL: 5000,   // Full sync every 5s
    AI_THINK_INTERVAL: 3000,  // NPCs think every 3s
    NEEDS_BROADCAST_INTERVAL: 500 // Needs update every 500ms
};

export const GAME = {
    MINUTES_PER_SECOND: 15,   // 15 game-minutes per real second at 1x
    DAY_START: 540,           // 9:00 AM in minutes
    DAY_END: 1020,            // 5:00 PM in minutes
    DAYS_PER_WEEK: 5,
    MAX_PLAYERS_PER_ROOM: 8,
    MAX_NPCS_PER_ROOM: 10,
    EMPTY_ROOM_TTL: 5 * 60 * 1000 // Destroy empty rooms after 5 min
};

export const LIMITS = {
    MAX_NAME_LENGTH: 12,
    MAX_SPEECH_LENGTH: 100,
    MAX_ROOMS: 20,
    MAX_CHARACTERS_PER_PLAYER: 5,
    CANVAS_WIDTH: 720,
    CANVAS_HEIGHT: 450
};
