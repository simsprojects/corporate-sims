/**
 * UIManager — handles all DOM-based UI updates.
 * Updates sidebar character list, selected character panel,
 * action menus, time display, weekly summary modal, and notifications.
 */

import { findAreaAt } from './officeLayout.js';

// ========== CONSTANTS ==========

const NEED_NAMES = ['hunger', 'energy', 'social', 'comfort', 'fun', 'hygiene', 'bladder'];

const NEED_ICONS = {
    hunger: '\u{1F354}',
    energy: '\u26A1',
    social: '\u{1F465}',
    comfort: '\u{1F6CB}\uFE0F',
    fun: '\u{1F3AE}',
    hygiene: '\u{1F6BF}',
    bladder: '\u{1F6BD}'
};

const NEED_COLORS = {
    hunger: '#e74c3c',
    energy: '#f39c12',
    social: '#3498db',
    comfort: '#9b59b6',
    fun: '#2ecc71',
    hygiene: '#1abc9c',
    bladder: '#e67e22'
};

const CATEGORY_LABELS = {
    work: 'Work',
    slack: 'Slack',
    fun: 'Fun',
    social: 'Social',
    need: 'Needs',
    chaos: 'Chaos',
    emotional: 'Emotional',
    coworker_work: 'Coworker'
};

const CATEGORY_ICONS = {
    work: '\u{1F4BC}',
    slack: '\u{1F60E}',
    fun: '\u{1F389}',
    social: '\u{1F5E3}\uFE0F',
    need: '\u{1F37D}\uFE0F',
    chaos: '\u{1F525}',
    emotional: '\u{1F62D}',
    coworker_work: '\u{1F914}'
};

// ========== HELPER FUNCTIONS ==========

function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getNeedBarColor(value) {
    if (value > 70) return '#2ecc71';
    if (value > 40) return '#f1c40f';
    if (value > 20) return '#e67e22';
    return '#e74c3c';
}

function getMoodEmoji(mood) {
    if (mood > 70) return '\u{1F60A}';
    if (mood > 50) return '\u{1F610}';
    if (mood > 30) return '\u{1F615}';
    if (mood > 15) return '\u{1F61F}';
    return '\u{1F62B}';
}

function renderMiniNeeds(needs) {
    let html = '<div class="mini-needs">';
    for (const need of NEED_NAMES) {
        const val = needs[need] || 0;
        const color = getNeedBarColor(val);
        html += `<div class="mini-need-bar" title="${need}: ${Math.round(val)}%">`;
        html += `<div class="mini-need-fill" style="width:${val}%;background:${color}"></div>`;
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function renderDetailedNeeds(needs) {
    let html = '<div class="detailed-needs">';
    for (const need of NEED_NAMES) {
        const val = needs[need] || 0;
        const barColor = getNeedBarColor(val);
        html += '<div class="need-row">';
        html += `<span class="need-icon">${NEED_ICONS[need] || ''}</span>`;
        html += `<span class="need-label">${need}</span>`;
        html += '<div class="need-bar">';
        html += `<div class="need-fill" style="width:${val}%;background:${barColor}"></div>`;
        html += '</div>';
        html += `<span class="need-value">${Math.round(val)}</span>`;
        html += '</div>';
    }
    html += '</div>';
    return html;
}

// ========== UIMANAGER CLASS ==========

export class UIManager {
    constructor() {
        // Cache DOM elements
        this.charListEl = document.getElementById('character-list');
        this.selectedPanelEl = document.getElementById('selected-panel');
        this.actionMenuEl = document.getElementById('action-menu');
        this.timeDisplayEl = document.getElementById('time-display');
        this.notificationEl = document.getElementById('notifications');
        this.modalOverlayEl = document.getElementById('modal-overlay');

        // State
        this.currentCategory = 'all';
    }

    // ==========================================
    // CHARACTER LIST (sidebar)
    // ==========================================

    /**
     * Render the sidebar list of all characters.
     * @param {Map} characters - Map of character objects
     * @param {string} selectedId - Currently selected character ID
     */
    updateCharacterList(characters, selectedId) {
        if (!this.charListEl) return;

        const chars = Array.from(characters.values())
            .sort((a, b) => {
                if (a.isPlayer && !b.isPlayer) return -1;
                if (!a.isPlayer && b.isPlayer) return 1;
                return a.name.localeCompare(b.name);
            });

        let html = '';
        for (const char of chars) {
            const isSelected = char.id === selectedId;
            const mood = char.getOverallMood();
            const moodEmoji = getMoodEmoji(mood);
            const emoji = char.emotion?.emoji || moodEmoji;
            const actionText = char.currentAction
                ? (char.currentAction.name || char.currentAction.id)
                : (char.state === 'walking' ? 'Walking...' : 'Idle');

            html += `<div class="char-card ${isSelected ? 'selected' : ''} ${char.isPlayer ? 'player' : ''}" data-char-id="${char.id}">`;
            html += '<div class="char-card-header">';
            html += `<span class="char-emoji">${emoji}</span>`;
            html += '<div class="char-info">';
            html += `<span class="char-name">${char.name}</span>`;
            html += `<span class="char-role">${char.role}</span>`;
            html += '</div>';
            html += `<span class="char-mood-indicator" style="color:${getNeedBarColor(mood)}">${moodEmoji}</span>`;
            html += '</div>';
            html += `<div class="char-action-text">${actionText}</div>`;
            html += renderMiniNeeds(char.needs);
            html += '</div>';
        }

        this.charListEl.innerHTML = html;
    }

    // ==========================================
    // SELECTED CHARACTER PANEL
    // ==========================================

    /**
     * Update the detailed panel for the selected character.
     * @param {object} char - The selected character
     * @param {boolean} isOwnPlayer - Whether this is the current player's character
     */
    updateSelectedChar(char, isOwnPlayer) {
        if (!this.selectedPanelEl || !char) {
            if (this.selectedPanelEl) {
                this.selectedPanelEl.innerHTML = '<div class="no-selection">Click a character to inspect</div>';
            }
            return;
        }

        const mood = char.getOverallMood();
        const area = findAreaAt(char.displayX, char.displayY);
        const areaName = area ? area.name : 'Unknown';

        let html = '<div class="selected-char-detail">';

        // Header
        html += '<div class="detail-header">';
        html += `<span class="detail-emoji">${char.emotion?.emoji || '\u{1F610}'}</span>`;
        html += '<div>';
        html += `<div class="detail-name ${char.isPlayer ? 'player-name' : ''}">${char.name}</div>`;
        html += `<div class="detail-role">${char.role}</div>`;
        html += '</div>';
        html += '</div>';

        // Location
        html += `<div class="detail-location">Location: <strong>${areaName}</strong></div>`;

        // Current activity
        if (char.currentAction) {
            const progress = char.currentAction.progress || 0;
            const duration = char.currentAction.duration || 100;
            const pct = Math.min(100, Math.round((progress / duration) * 100));
            html += '<div class="detail-activity">';
            html += `<div class="activity-name">${char.currentAction.name || char.currentAction.id}</div>`;
            html += '<div class="activity-progress-bar">';
            html += `<div class="activity-progress-fill" style="width:${pct}%"></div>`;
            html += '</div>';
            html += `<div class="activity-pct">${pct}%</div>`;
            html += '</div>';
        } else {
            html += `<div class="detail-activity"><div class="activity-name">${char.state === 'walking' ? 'Walking...' : 'Idle'}</div></div>`;
        }

        // Personality traits
        if (char.personality && char.personality.traits && char.personality.traits.length > 0) {
            html += '<div class="detail-traits">';
            for (const trait of char.personality.traits) {
                html += `<span class="trait-tag">${trait}</span>`;
            }
            html += '</div>';
        }

        // Detailed needs
        html += '<div class="detail-section-title">Needs</div>';
        html += renderDetailedNeeds(char.needs);

        // Slack points
        html += `<div class="detail-slack">Slack Points: <strong>${char.slackPoints || 0}</strong></div>`;

        // Action buttons for player, relationship info for NPC
        if (isOwnPlayer) {
            html += '<div class="detail-actions">';
            html += '<button class="btn-cancel-action" id="btn-cancel-action">Cancel Action</button>';
            html += '<div class="speak-input">';
            html += '<input type="text" id="speak-input" placeholder="Say something..." maxlength="100">';
            html += '<button class="btn-speak" id="btn-speak">Say</button>';
            html += '</div>';
            html += '</div>';
        } else {
            html += '<div class="detail-section-title">Relationship</div>';
            html += '<div class="detail-relationship">';
            html += `<div class="rel-info">Expression: ${char.expression || 'neutral'}</div>`;
            html += `<div class="rel-info">Mood: ${Math.round(mood)}%</div>`;
            html += '</div>';
        }

        // Recent memories
        if (char.memory && char.memory.recentEvents && char.memory.recentEvents.length > 0) {
            html += '<div class="detail-section-title">Recent</div>';
            html += '<div class="detail-memories">';
            for (const mem of char.memory.recentEvents.slice(0, 3)) {
                const icon = mem.type === 'action_complete' ? '\u2705' : '\u{1F4DD}';
                html += `<div class="memory-item">${icon} ${mem.action || mem.type}</div>`;
            }
            html += '</div>';
        }

        html += '</div>';
        this.selectedPanelEl.innerHTML = html;
    }

    // ==========================================
    // ACTION MENU
    // ==========================================

    /**
     * Update the action menu for the player's character.
     * @param {object} char - The player's character
     * @param {Array} actions - All available actions
     * @param {string} currentCategory - Current filter category
     */
    updateActionMenu(char, actions, currentCategory) {
        if (!this.actionMenuEl || !char || !actions) return;

        this.currentCategory = currentCategory || 'all';
        const area = findAreaAt(char.displayX, char.displayY);
        const areaType = area ? area.type : null;

        // Build category tabs
        const categories = ['all'];
        const catSet = new Set();
        for (const action of actions) {
            if (action.category && !catSet.has(action.category) && !action.isCoworkerAction) {
                catSet.add(action.category);
                categories.push(action.category);
            }
        }

        let html = '<div class="action-categories">';
        for (const cat of categories) {
            const isActive = cat === this.currentCategory;
            const icon = cat === 'all' ? '\u{1F4CB}' : (CATEGORY_ICONS[cat] || '\u{1F4CB}');
            const label = cat === 'all' ? 'All' : (CATEGORY_LABELS[cat] || cat);
            html += `<button class="cat-tab ${isActive ? 'active' : ''}" data-category="${cat}">`;
            html += `${icon} ${label}`;
            html += '</button>';
        }
        html += '</div>';

        // Filter actions
        let filtered = actions;
        if (this.currentCategory !== 'all') {
            filtered = actions.filter(a => a.category === this.currentCategory);
        }

        // Filter out coworker actions for player
        filtered = filtered.filter(a => !a.isCoworkerAction);

        // Sort: available first, then alphabetical
        filtered.sort((a, b) => {
            const aAvail = this._isActionAvailable(a, areaType) ? 0 : 1;
            const bAvail = this._isActionAvailable(b, areaType) ? 0 : 1;
            if (aAvail !== bAvail) return aAvail - bAvail;
            return (a.name || '').localeCompare(b.name || '');
        });

        // Render action list
        html += '<div class="action-list">';
        for (const action of filtered) {
            const available = this._isActionAvailable(action, areaType);
            const isCurrentAction = char.currentAction && char.currentAction.id === action.id;
            const slackClass = (action.slackPoints || 0) > 0 ? 'slack-positive' : ((action.slackPoints || 0) < 0 ? 'slack-negative' : '');

            html += `<div class="action-item ${available ? '' : 'disabled'} ${isCurrentAction ? 'current' : ''}" data-action-id="${action.id}">`;
            html += `<div class="action-name">${action.name}</div>`;
            html += '<div class="action-meta">';

            // Duration
            html += `<span class="action-duration">\u23F1 ${action.duration}m</span>`;

            // Slack points
            if (action.slackPoints) {
                const sign = action.slackPoints > 0 ? '+' : '';
                html += `<span class="action-slack ${slackClass}">${sign}${action.slackPoints} SP</span>`;
            }

            // Location requirement
            if (action.requiresArea) {
                const inArea = areaType === action.requiresArea;
                html += `<span class="action-location ${inArea ? 'in-area' : 'out-area'}">\u{1F4CD} ${action.requiresArea}</span>`;
            }

            html += '</div>';
            html += '</div>';
        }
        if (filtered.length === 0) {
            html += '<div class="no-actions">No actions in this category</div>';
        }
        html += '</div>';

        this.actionMenuEl.innerHTML = html;
    }

    /**
     * Check if an action is available based on area requirements.
     */
    _isActionAvailable(action, currentAreaType) {
        if (!action.requiresArea) return true;
        if (!currentAreaType) return false;

        const areaMap = {
            manager: ['manager'], reception: ['reception'],
            annex: ['annex', 'cubicle'], supply: ['supply'],
            warehouse: ['warehouse'], meeting: ['meeting'],
            cubicle: ['cubicle'], kitchen: ['kitchen'],
            bathroom: ['bathroom'], lounge: ['lounge'],
            hallway: []
        };
        const validAreas = areaMap[currentAreaType] || [currentAreaType];
        return validAreas.includes(action.requiresArea);
    }

    // ==========================================
    // TIME DISPLAY
    // ==========================================

    /**
     * Update the header time display.
     */
    updateTimeDisplay(day, time) {
        if (!this.timeDisplayEl) return;
        const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][(day - 1) % 5] || 'Day';
        const week = Math.ceil(day / 5);
        this.timeDisplayEl.innerHTML = `<span class="time-day">Week ${week} - ${dayName}</span> <span class="time-clock">${formatTime(time)}</span>`;
    }

    // ==========================================
    // WEEKLY SUMMARY MODAL
    // ==========================================

    /**
     * Show end-of-week summary modal.
     * @param {object} data - { week, quote, stats, rank }
     */
    showWeeklySummary(data) {
        if (!this.modalOverlayEl) return;

        const stats = data.stats || {};
        const rank = data.rank || { name: 'Unknown', color: '#888' };

        let html = '<div class="modal weekly-modal">';
        html += '<div class="modal-header">';
        html += `<h2>Week ${data.week} Performance Review</h2>`;
        html += '</div>';

        // Quote
        html += `<div class="weekly-quote">${data.quote || ''}</div>`;

        // Rank
        html += '<div class="weekly-rank">';
        html += '<span class="rank-label">Your Rank:</span>';
        html += `<span class="rank-name" style="color:${rank.color}">${rank.name}</span>`;
        html += '</div>';

        // Stats
        html += '<div class="weekly-stats">';
        html += `<div class="stat-row"><span>Slack Points:</span><strong>${stats.slackPoints || 0}</strong></div>`;
        html += `<div class="stat-row"><span>Work Done:</span><strong>${stats.workDone || 0}</strong></div>`;
        html += `<div class="stat-row"><span>Meetings Avoided:</span><strong>${stats.meetingsAvoided || 0}</strong></div>`;
        html += `<div class="stat-row"><span>Coffees:</span><strong>${stats.coffeeDrunk || 0}</strong></div>`;
        html += `<div class="stat-row"><span>Bathroom Trips:</span><strong>${stats.bathroomTrips || 0}</strong></div>`;
        html += '</div>';

        // Coworker shame
        if (stats.coworkerShame && stats.coworkerShame.length > 0) {
            html += '<div class="weekly-shame">';
            html += '<div class="shame-title">\u{1F614} Meanwhile, your coworkers...</div>';
            for (const shame of stats.coworkerShame) {
                html += `<div class="shame-item">${shame}</div>`;
            }
            html += '</div>';
        }

        // Close button
        html += '<button class="modal-close" id="modal-close">Back to Slacking</button>';
        html += '</div>';

        this.modalOverlayEl.innerHTML = html;
        this.modalOverlayEl.classList.add('visible');

        // Bind close
        const closeBtn = document.getElementById('modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.modalOverlayEl.classList.remove('visible');
            });
        }
    }

    // ==========================================
    // NOTIFICATIONS
    // ==========================================

    /**
     * Show a toast notification.
     */
    showNotification(text) {
        if (!this.notificationEl) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        this.notificationEl.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}
