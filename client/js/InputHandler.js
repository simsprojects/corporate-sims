/**
 * InputHandler — captures canvas clicks, keyboard events, and DOM interactions.
 * Translates user input into game commands sent via Socket.io.
 * Manages canvas mousemove for hover state and cursor changes.
 */

import { OFFICE_AREAS, findAreaAt } from './officeLayout.js';

export class InputHandler {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {import('./GameClient.js').GameClient} gameClient
     * @param {import('./Renderer.js').Renderer} renderer
     * @param {import('./UIManager.js').UIManager} uiManager
     * @param {SocketIOClient.Socket} socket
     */
    constructor(canvas, gameClient, renderer, uiManager, socket) {
        this.canvas = canvas;
        this.gameClient = gameClient;
        this.renderer = renderer;
        this.uiManager = uiManager;
        this.socket = socket;

        // Current action category filter
        this.currentCategory = 'all';

        // Bind events
        this._bindCanvasEvents();
        this._bindDOMEvents();
    }

    // ==========================================
    // CANVAS EVENTS
    // ==========================================

    _bindCanvasEvents() {
        // Click on canvas
        this.canvas.addEventListener('click', (e) => this._onCanvasClick(e));

        // Mouse move for hover effects
        this.canvas.addEventListener('mousemove', (e) => this._onCanvasMouseMove(e));

        // Mouse leave — clear hover
        this.canvas.addEventListener('mouseleave', () => {
            this.renderer.hoveredArea = null;
            this.canvas.style.cursor = 'default';
        });
    }

    /**
     * Get canvas-relative coordinates from a mouse event.
     */
    _getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    /**
     * Handle canvas click: character selection or movement.
     */
    _onCanvasClick(e) {
        const pos = this._getCanvasPos(e);

        // Add click effect
        this.renderer.addClickEffect(pos.x, pos.y);

        // Check if clicking on a character
        const clickedChar = this.gameClient.findCharacterAt(pos.x, pos.y);

        if (clickedChar) {
            // Select the character
            this.gameClient.selectCharacter(clickedChar.id);
            return;
        }

        // Check if we have a player character
        const playerChar = this.gameClient.getPlayerCharacter();
        if (!playerChar) return;

        // If clicking on an interactive area, check if player needs to move there
        const area = findAreaAt(pos.x, pos.y);

        // Only move if player is not currently performing an action
        if (!playerChar.currentAction) {
            this.socket.emit('player:move', {
                targetX: pos.x,
                targetY: pos.y
            });
        }
    }

    /**
     * Handle canvas mousemove: hover highlight on interactive areas.
     */
    _onCanvasMouseMove(e) {
        const pos = this._getCanvasPos(e);

        // Check if hovering over an interactive area
        const area = findAreaAt(pos.x, pos.y);

        if (area && area.interactive) {
            this.renderer.hoveredArea = area;
            this.canvas.style.cursor = 'pointer';
        } else {
            // Check if hovering over a character
            const hoverChar = this.gameClient.findCharacterAt(pos.x, pos.y);
            if (hoverChar) {
                this.canvas.style.cursor = 'pointer';
                this.renderer.hoveredArea = null;
            } else {
                this.renderer.hoveredArea = null;
                this.canvas.style.cursor = 'default';
            }
        }
    }

    // ==========================================
    // DOM EVENTS (delegated)
    // ==========================================

    _bindDOMEvents() {
        // Use event delegation on the document for dynamically created elements
        document.addEventListener('click', (e) => {
            const target = e.target;

            // Character card click (select character)
            const charCard = target.closest('.char-card');
            if (charCard) {
                const charId = charCard.dataset.charId;
                if (charId) {
                    this.gameClient.selectCharacter(charId);
                }
                return;
            }

            // Category tab click
            const catTab = target.closest('.cat-tab');
            if (catTab) {
                const category = catTab.dataset.category;
                if (category) {
                    this.currentCategory = category;
                    this._refreshActionMenu();
                }
                return;
            }

            // Action item click
            const actionItem = target.closest('.action-item');
            if (actionItem && !actionItem.classList.contains('disabled')) {
                const actionId = actionItem.dataset.actionId;
                if (actionId) {
                    this.socket.emit('action:perform', { actionId });
                }
                return;
            }

            // Cancel action button
            if (target.id === 'btn-cancel-action') {
                this.socket.emit('action:cancel');
                return;
            }

            // Speak button
            if (target.id === 'btn-speak') {
                this._handleSpeak();
                return;
            }

            // Speed control buttons
            if (target.dataset.speed !== undefined) {
                const speed = parseInt(target.dataset.speed, 10);
                if (!isNaN(speed)) {
                    this.socket.emit('game:speed', { speed });
                }
                return;
            }
        });

        // Handle enter key in speak input
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'speak-input') {
                this._handleSpeak();
            }
        });
    }

    /**
     * Send speech from the speak input field.
     */
    _handleSpeak() {
        const input = document.getElementById('speak-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        this.socket.emit('player:speak', { text });
        input.value = '';
    }

    /**
     * Refresh the action menu with the current category filter.
     */
    _refreshActionMenu() {
        const playerChar = this.gameClient.getPlayerCharacter();
        if (!playerChar) return;

        this.uiManager.updateActionMenu(
            playerChar,
            this.gameClient.actions,
            this.currentCategory
        );
    }

    /**
     * Get the current action category for external use.
     */
    getCurrentCategory() {
        return this.currentCategory;
    }
}
