/**
 * main.js -- Client entry point.
 * Initializes Socket.io, GameClient, Renderer, UIManager, InputHandler.
 * Runs the 60fps render loop and periodic UI updates.
 * Exposes joinGame() globally for the lobby form.
 */

import { GameClient } from './GameClient.js';
import { Renderer } from './Renderer.js';
import { UIManager } from './UIManager.js';
import { InputHandler } from './InputHandler.js';

// ========== GLOBALS ==========

let socket = null;
let gameClient = null;
let renderer = null;
let uiManager = null;
let inputHandler = null;

let lastFrameTime = 0;
let uiUpdateTimer = 0;
const UI_UPDATE_INTERVAL = 250; // Update DOM UI every 250ms (not every frame)

// ========== INITIALIZATION ==========

/**
 * Initialize Socket.io connection and all game modules.
 */
function init() {
    // Socket.io is loaded via CDN in the HTML <script> tag
    // It exposes the global `io` function
    if (typeof io === 'undefined') {
        console.error('[main] Socket.io not loaded. Make sure the CDN script is included in HTML.');
        return;
    }

    // Connect to server (same origin)
    socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
    });

    socket.on('connect', () => {
        console.log('[main] Connected to server:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('[main] Disconnected:', reason);
        if (uiManager) {
            uiManager.showNotification('Disconnected from server. Reconnecting...');
        }
    });

    socket.on('reconnect', () => {
        console.log('[main] Reconnected');
        if (uiManager) {
            uiManager.showNotification('Reconnected to server!');
        }
    });

    // Initialize modules
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('[main] Canvas element #game-canvas not found.');
        return;
    }

    gameClient = new GameClient();
    renderer = new Renderer(canvas);
    uiManager = new UIManager();

    // Bind socket to game client
    gameClient.bindSocket(socket);

    // Set up game client callbacks
    gameClient.onSnapshot = (data) => {
        // Full UI refresh on snapshot
        updateUI();
    };

    gameClient.onDelta = (data) => {
        // Deltas are handled in the render loop via interpolation
    };

    gameClient.onWeeklySummary = (data) => {
        uiManager.showWeeklySummary(data);
    };

    gameClient.onNotification = (text) => {
        uiManager.showNotification(text);
    };

    // Initialize input handler (needs socket)
    inputHandler = new InputHandler(canvas, gameClient, renderer, uiManager, socket);

    // Start render loop
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);

    console.log('[main] Game client initialized. Call joinGame() to enter a room.');
}

// ========== GAME LOOP ==========

/**
 * Main game loop — runs at ~60fps via requestAnimationFrame.
 */
function gameLoop(timestamp) {
    const deltaMs = Math.min(timestamp - lastFrameTime, 50); // Cap at 50ms to avoid spiral
    lastFrameTime = timestamp;

    // Update game client (interpolation, speech timers)
    if (gameClient) {
        gameClient.update(deltaMs);
    }

    // Render
    if (renderer && gameClient) {
        renderer.render(gameClient, deltaMs);
    }

    // Periodic UI updates (DOM is expensive, don't do every frame)
    uiUpdateTimer += deltaMs;
    if (uiUpdateTimer >= UI_UPDATE_INTERVAL) {
        uiUpdateTimer = 0;
        updateUI();
    }

    requestAnimationFrame(gameLoop);
}

/**
 * Update all DOM UI elements.
 */
function updateUI() {
    if (!gameClient || !uiManager) return;

    // Time display
    uiManager.updateTimeDisplay(gameClient.gameDay, gameClient.gameTime);

    // Character list
    uiManager.updateCharacterList(gameClient.characters, gameClient.selectedCharId);

    // Selected character panel
    const selectedChar = gameClient.getSelectedCharacter();
    const isOwnPlayer = selectedChar && selectedChar.id === gameClient.playerId;
    uiManager.updateSelectedChar(selectedChar, isOwnPlayer);

    // Action menu (only if we have a player character)
    const playerChar = gameClient.getPlayerCharacter();
    if (playerChar && gameClient.actions.length > 0) {
        const currentCat = inputHandler ? inputHandler.getCurrentCategory() : 'all';
        uiManager.updateActionMenu(playerChar, gameClient.actions, currentCat);
    }
}

// ========== JOIN GAME ==========

/**
 * Join a game room. Exposed globally for the lobby form.
 * @param {object} options
 * @param {string} options.roomId - Room to join
 * @param {string} options.playerName - Player display name
 * @param {object} options.character - Character creation data
 */
function joinGame(options) {
    if (!socket || !socket.connected) {
        console.error('[main] Not connected to server yet.');
        if (uiManager) uiManager.showNotification('Not connected to server. Please wait...');
        return;
    }

    const defaults = {
        roomId: 'default',
        playerName: 'Player',
        character: {
            name: 'Player',
            role: 'Employee',
            skinTone: '#f5d0b0',
            hairColor: '#2a1a0a',
            hairStyle: 'short',
            shirtColor: '#3498db'
        }
    };

    const data = {
        roomId: options?.roomId || defaults.roomId,
        playerName: options?.playerName || defaults.playerName,
        character: {
            ...defaults.character,
            ...(options?.character || {})
        }
    };

    // Ensure character name matches player name if not specified
    if (!options?.character?.name) {
        data.character.name = data.playerName;
    }

    console.log('[main] Joining room:', data.roomId, 'as', data.character.name);
    socket.emit('room:join', data);

    // Show the game UI, hide lobby
    const lobbyEl = document.getElementById('lobby');
    const gameEl = document.getElementById('game');
    if (lobbyEl) lobbyEl.style.display = 'none';
    if (gameEl) gameEl.style.display = 'flex';

    if (uiManager) {
        uiManager.showNotification(`Joining as ${data.character.name}...`);
    }
}

// ========== EXPOSE GLOBALLY ==========

// Expose joinGame so the HTML form can call it
window.joinGame = joinGame;

// ========== BOOT ==========

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
