import { z } from 'zod';
import { LIMITS } from '../config.js';

// ========== Input Validation Schemas ==========

const JoinRoomSchema = z.object({
    roomId: z.string().min(1).max(50),
    playerName: z.string().min(1).max(LIMITS.MAX_NAME_LENGTH),
    character: z.object({
        name: z.string().min(1).max(LIMITS.MAX_NAME_LENGTH),
        role: z.string().min(1).max(30),
        skinTone: z.string().max(10),
        hairColor: z.string().max(10),
        hairStyle: z.string().max(15),
        shirtColor: z.string().max(10)
    })
});

const PerformActionSchema = z.object({
    actionId: z.string().min(1).max(50)
});

const MoveSchema = z.object({
    targetX: z.number().min(0).max(LIMITS.CANVAS_WIDTH),
    targetY: z.number().min(0).max(LIMITS.CANVAS_HEIGHT)
});

const SpeakSchema = z.object({
    text: z.string().min(1).max(LIMITS.MAX_SPEECH_LENGTH)
});

/**
 * Handles all Socket.io events.
 * Routes messages between clients and game rooms.
 */
export class SocketHandler {
    constructor(io, getOrCreateRoom) {
        this.io = io;
        this.getOrCreateRoom = getOrCreateRoom;
        this.socketToRoom = new Map();
    }

    init() {
        this.io.on('connection', (socket) => {
            console.log(`[WS] Client connected: ${socket.id}`);

            socket.on('room:join', (data) => this._onJoinRoom(socket, data));
            socket.on('room:leave', () => this._onLeaveRoom(socket));
            socket.on('action:perform', (data) => this._onAction(socket, data));
            socket.on('action:cancel', () => this._onCancelAction(socket));
            socket.on('player:move', (data) => this._onMove(socket, data));
            socket.on('player:speak', (data) => this._onSpeak(socket, data));

            socket.on('disconnect', () => {
                this._onLeaveRoom(socket);
                console.log(`[WS] Client disconnected: ${socket.id}`);
            });
        });
    }

    _onJoinRoom(socket, rawData) {
        const parsed = JoinRoomSchema.safeParse(rawData);
        if (!parsed.success) {
            socket.emit('error', { message: 'Invalid join data', details: parsed.error.issues });
            return;
        }

        // Leave any existing room first
        this._onLeaveRoom(socket);

        const data = parsed.data;
        const room = this.getOrCreateRoom(data.roomId);
        const playerId = `player_${socket.id}`;

        socket.join(data.roomId);
        this.socketToRoom.set(socket.id, data.roomId);

        room.addPlayer(socket, playerId, {
            name: data.character.name,
            role: data.character.role,
            skinTone: data.character.skinTone,
            hairColor: data.character.hairColor,
            hairStyle: data.character.hairStyle,
            shirtColor: data.character.shirtColor,
            personality: {}
        });
    }

    _onLeaveRoom(socket) {
        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.getOrCreateRoom(roomId);
        room.removePlayer(socket.id);
        socket.leave(roomId);
        this.socketToRoom.delete(socket.id);
    }

    _onAction(socket, rawData) {
        const parsed = PerformActionSchema.safeParse(rawData);
        if (!parsed.success) return;

        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) return;

        this.getOrCreateRoom(roomId).queueInput(socket.id, {
            type: 'action:perform',
            actionId: parsed.data.actionId
        });
    }

    _onCancelAction(socket) {
        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) return;

        this.getOrCreateRoom(roomId).queueInput(socket.id, {
            type: 'action:cancel'
        });
    }

    _onMove(socket, rawData) {
        const parsed = MoveSchema.safeParse(rawData);
        if (!parsed.success) return;

        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) return;

        this.getOrCreateRoom(roomId).queueInput(socket.id, {
            type: 'player:move',
            targetX: parsed.data.targetX,
            targetY: parsed.data.targetY
        });
    }

    _onSpeak(socket, rawData) {
        const parsed = SpeakSchema.safeParse(rawData);
        if (!parsed.success) return;

        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) return;

        this.getOrCreateRoom(roomId).queueInput(socket.id, {
            type: 'player:speak',
            text: parsed.data.text
        });
    }
}
