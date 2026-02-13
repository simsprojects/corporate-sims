/**
 * Renderer — full canvas rendering for the corporate simulation.
 * Draws the office environment, furniture, decorations, and characters
 * with detailed Sims-style art.
 */

import { OFFICE_AREAS, findAreaAt } from './officeLayout.js';

// ========== CONSTANTS ==========

const CANVAS_W = 720;
const CANVAS_H = 450;

const DECORATIVE_PLANTS = [
    { x: 25, y: 120 }, { x: 695, y: 120 },
    { x: 25, y: 210 }, { x: 695, y: 210 },
    { x: 340, y: 215 }, { x: 540, y: 215 }
];

const ACTION_EMOJIS = {
    work_hard: '\u{1F4BB}', synergize_paradigm: '\u{1F4CA}', tps_reports: '\u{1F4C4}',
    reply_all: '\u{1F4E7}', pretend_work: '\u{2328}\uFE0F', browse_reddit: '\u{1F4F1}',
    online_shopping: '\u{1F6D2}', desk_nap: '\u{1F634}', fake_phone_call: '\u{1F4DE}',
    reorganize_desk: '\u{1F9F9}', meeting: '\u{1F4CB}', hide_meeting: '\u{1F643}',
    buzzword_bingo: '\u{1F3B0}', schedule_meeting: '\u{1F4C5}', give_presentation: '\u{1F4CA}',
    prank_coworker: '\u{1F3AD}', stare_at_camera: '\u{1F440}', office_olympics: '\u{1F3C6}',
    disappear_completely: '\u{1F47B}', coffee: '\u2615', microwave_fish: '\u{1F41F}',
    steal_lunch: '\u{1F355}', gossip: '\u{1F5E3}\uFE0F', bathroom: '\u{1F6BB}',
    bathroom_break_extended: '\u{1F4F1}', bathroom_cry: '\u{1F62D}', nap: '\u{1F634}',
    games: '\u{1F3AE}', bean_bag_therapy: '\u{1F6CB}\uFE0F', supply_closet_hide: '\u{1F4E6}',
    visit_manager: '\u{1F454}', take_credit: '\u{1F3C5}', candy_jar: '\u{1F36C}',
    flirt_reception: '\u{1F48C}', phone_scroll: '\u{1F4F1}', long_walk: '\u{1F6B6}',
    pretend_busy: '\u{1F4C3}', leave_early: '\u{1F3C3}'
};

// ========== HELPER FUNCTIONS ==========

/**
 * Shade a hex color lighter or darker.
 * @param {string} color - Hex color string
 * @param {number} percent - Positive = lighter, negative = darker
 * @returns {string} Adjusted hex color
 */
function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, ((num >> 16) & 0xFF) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0xFF) + amt));
    return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

/**
 * Format game time (minutes since midnight) to HH:MM string.
 */
function formatGameTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ========== RENDERER CLASS ==========

export class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = CANVAS_W;
        this.canvas.height = CANVAS_H;

        // Interaction state (set by InputHandler)
        this.hoveredArea = null;
        this.selectedCharId = null;

        // Click effect
        this.clickEffects = [];

        // Animation time
        this.time = 0;
    }

    /**
     * Add a click effect at position.
     */
    addClickEffect(x, y) {
        this.clickEffects.push({ x, y, radius: 5, maxRadius: 30, alpha: 1.0 });
    }

    /**
     * Main render call — draws everything.
     * @param {import('./GameClient.js').GameClient} gameClient
     * @param {number} deltaMs
     */
    render(gameClient, deltaMs) {
        this.time += deltaMs;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw layers
        this._drawFloor(ctx);
        this._drawWalls(ctx, gameClient.gameTime);
        this._drawOfficeAreas(ctx);
        this._drawFurniture(ctx);
        this._drawDecorations(ctx, gameClient.gameTime);
        this._drawHoverHighlight(ctx);
        this._drawPlants(ctx);

        // Draw characters sorted by Y (depth)
        const chars = gameClient.getCharactersSortedByDepth();
        for (const char of chars) {
            this._drawCharacter(ctx, char, gameClient);
        }

        // Draw click effects
        this._updateAndDrawClickEffects(ctx, deltaMs);
    }

    // ==========================================
    // ENVIRONMENT DRAWING
    // ==========================================

    _drawFloor(ctx) {
        // Wood floor base
        ctx.fillStyle = '#d4a56a';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Plank pattern
        ctx.strokeStyle = '#c89858';
        ctx.lineWidth = 0.5;
        const plankH = 18;
        const plankW = 60;
        for (let row = 0; row < CANVAS_H / plankH + 1; row++) {
            const y = row * plankH;
            // Horizontal plank lines
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_W, y);
            ctx.stroke();

            // Vertical joints (offset every other row)
            const offset = (row % 2) * (plankW / 2);
            for (let col = 0; col < CANVAS_W / plankW + 2; col++) {
                const x = col * plankW + offset;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + plankH);
                ctx.stroke();
            }
        }

        // Wood grain texture
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.08)';
        ctx.lineWidth = 0.3;
        for (let i = 0; i < 80; i++) {
            const gx = (i * 97) % CANVAS_W;
            const gy = (i * 53) % CANVAS_H;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.quadraticCurveTo(gx + 20, gy + ((i % 3) - 1) * 3, gx + 40, gy);
            ctx.stroke();
        }
    }

    _drawWalls(ctx, gameTime) {
        // Top wall
        ctx.fillStyle = '#e8ddd0';
        ctx.fillRect(0, 0, CANVAS_W, 25);
        // Baseboard
        ctx.fillStyle = '#b89870';
        ctx.fillRect(0, 22, CANVAS_W, 3);

        // Left wall
        ctx.fillStyle = '#e0d5c8';
        ctx.fillRect(0, 0, 25, CANVAS_H);
        ctx.fillStyle = '#b89870';
        ctx.fillRect(22, 0, 3, CANVAS_H);

        // Right wall
        ctx.fillStyle = '#e0d5c8';
        ctx.fillRect(CANVAS_W - 25, 0, 25, CANVAS_H);
        ctx.fillStyle = '#b89870';
        ctx.fillRect(CANVAS_W - 25, 0, 3, CANVAS_H);

        // Bottom wall
        ctx.fillStyle = '#e8ddd0';
        ctx.fillRect(0, CANVAS_H - 25, CANVAS_W, 25);
        ctx.fillStyle = '#b89870';
        ctx.fillRect(0, CANVAS_H - 25, CANVAS_W, 3);

        // Windows (top wall) — sky and buildings visible
        this._drawWindows(ctx, gameTime);

        // Ceiling — fluorescent and pendant lights
        this._drawCeiling(ctx);
    }

    _drawWindows(ctx, gameTime) {
        const windows = [
            { x: 80, y: 2, w: 60, h: 18 },
            { x: 200, y: 2, w: 60, h: 18 },
            { x: 350, y: 2, w: 60, h: 18 },
            { x: 470, y: 2, w: 60, h: 18 },
            { x: 590, y: 2, w: 60, h: 18 }
        ];

        for (const win of windows) {
            // Window frame
            ctx.fillStyle = '#888';
            ctx.fillRect(win.x - 2, win.y - 1, win.w + 4, win.h + 3);

            // Sky gradient
            const skyGrad = ctx.createLinearGradient(win.x, win.y, win.x, win.y + win.h);
            skyGrad.addColorStop(0, '#87CEEB');
            skyGrad.addColorStop(1, '#b0d8f0');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(win.x, win.y, win.w, win.h);

            // Buildings silhouette
            ctx.fillStyle = '#6a7a8a';
            const buildingHeights = [8, 12, 6, 10, 14, 7, 11, 9];
            const bw = win.w / buildingHeights.length;
            for (let i = 0; i < buildingHeights.length; i++) {
                const bh = buildingHeights[i];
                ctx.fillRect(win.x + i * bw, win.y + win.h - bh, bw - 1, bh);
                // Tiny windows on buildings
                ctx.fillStyle = '#aac0d0';
                for (let wy = 0; wy < bh - 2; wy += 3) {
                    for (let wx = 1; wx < bw - 2; wx += 3) {
                        ctx.fillRect(win.x + i * bw + wx, win.y + win.h - bh + wy + 1, 1.5, 1.5);
                    }
                }
                ctx.fillStyle = '#6a7a8a';
            }

            // Window divider
            ctx.fillStyle = '#999';
            ctx.fillRect(win.x + win.w / 2 - 0.5, win.y, 1, win.h);
        }
    }

    _drawCeiling(ctx) {
        // Fluorescent lights (long rectangular)
        const fluorescentLights = [
            { x: 120, y: 5 }, { x: 300, y: 5 }, { x: 500, y: 5 }
        ];
        for (const light of fluorescentLights) {
            // Glow
            ctx.fillStyle = 'rgba(255, 255, 240, 0.3)';
            ctx.fillRect(light.x - 2, light.y - 1, 54, 8);
            // Light fixture
            ctx.fillStyle = '#f8f8f0';
            ctx.fillRect(light.x, light.y, 50, 5);
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(light.x, light.y, 50, 5);
        }

        // Pendant lights (hanging)
        const pendants = [{ x: 230, y: 15 }, { x: 450, y: 15 }, { x: 630, y: 15 }];
        for (const p of pendants) {
            // Wire
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, 0);
            ctx.lineTo(p.x, p.y - 4);
            ctx.stroke();
            // Shade
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(p.x - 8, p.y - 4);
            ctx.lineTo(p.x + 8, p.y - 4);
            ctx.lineTo(p.x + 5, p.y);
            ctx.lineTo(p.x - 5, p.y);
            ctx.closePath();
            ctx.fill();
            // Bulb glow
            ctx.fillStyle = 'rgba(255, 240, 200, 0.5)';
            ctx.beginPath();
            ctx.arc(p.x, p.y + 2, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawOfficeAreas(ctx) {
        for (const area of OFFICE_AREAS) {
            // Floor fill
            ctx.fillStyle = area.color;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(area.x, area.y, area.w, area.h);
            ctx.globalAlpha = 1.0;

            // Border
            ctx.strokeStyle = shadeColor(area.color, 20);
            ctx.lineWidth = 1;
            ctx.strokeRect(area.x, area.y, area.w, area.h);

            // Area label
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = 'bold 7px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(area.name, area.x + area.w / 2, area.y + 9);
        }
    }

    _drawFurniture(ctx) {
        for (const area of OFFICE_AREAS) {
            switch (area.type) {
                case 'cubicle': this._drawCubicleFurniture(ctx, area); break;
                case 'meeting': this._drawMeetingFurniture(ctx, area); break;
                case 'kitchen': this._drawKitchenFurniture(ctx, area); break;
                case 'lounge': this._drawLoungeFurniture(ctx, area); break;
                case 'bathroom': this._drawBathroomFurniture(ctx, area); break;
                case 'manager': this._drawManagerFurniture(ctx, area); break;
                case 'reception': this._drawReceptionFurniture(ctx, area); break;
                case 'annex': this._drawAnnexFurniture(ctx, area); break;
                case 'supply': this._drawSupplyFurniture(ctx, area); break;
                case 'warehouse': this._drawWarehouseFurniture(ctx, area); break;
                case 'hallway': this._drawHallwayFurniture(ctx, area); break;
            }
        }
    }

    // ---- Cubicle furniture ----
    _drawCubicleFurniture(ctx, area) {
        const cx = area.x + area.w / 2;
        const cy = area.y + area.h / 2;

        // Standing desk
        ctx.fillStyle = '#e8d8c0';
        ctx.fillRect(cx - 18, cy - 18, 36, 4);
        // Desk legs
        ctx.fillStyle = '#888';
        ctx.fillRect(cx - 16, cy - 14, 2, 12);
        ctx.fillRect(cx + 14, cy - 14, 2, 12);

        // iMac monitor
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(cx - 7, cy - 28, 14, 11);
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(cx - 6, cy - 27, 12, 9);
        // Screen glow
        ctx.fillStyle = '#3050a0';
        ctx.fillRect(cx - 5, cy - 26, 10, 7);
        // Stand
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(cx - 1, cy - 17, 2, 3);

        // Colorful chair
        const chairColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
        const chairColor = chairColors[(area.x * 7 + area.y * 3) % chairColors.length];
        ctx.fillStyle = chairColor;
        ctx.beginPath();
        ctx.arc(cx, cy + 12, 7, 0, Math.PI * 2);
        ctx.fill();
        // Chair back
        ctx.fillStyle = shadeColor(chairColor, -15);
        ctx.fillRect(cx - 5, cy + 5, 10, 4);

        // Small plant
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(cx + 18, cy - 20, 6, 5);
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(cx + 21, cy - 22, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.arc(cx + 19, cy - 24, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- Meeting furniture ----
    _drawMeetingFurniture(ctx, area) {
        const cx = area.x + area.w / 2;
        const cy = area.y + area.h / 2;

        // Oval table
        ctx.fillStyle = '#c8a070';
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.min(area.w * 0.35, 30), 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a08050';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Colorful chairs around table
        const chairPositions = [
            { angle: 0 }, { angle: Math.PI / 2 },
            { angle: Math.PI }, { angle: Math.PI * 1.5 }
        ];
        const meetingChairColors = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71'];
        const rx = Math.min(area.w * 0.35, 30) + 8;
        const ry = 18;
        chairPositions.forEach((p, i) => {
            const px = cx + Math.cos(p.angle) * rx;
            const py = cy + Math.sin(p.angle) * ry;
            ctx.fillStyle = meetingChairColors[i % meetingChairColors.length];
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Whiteboard (on top edge of area)
        if (area.w > 60) {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(area.x + 8, area.y + 3, 30, 16);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.strokeRect(area.x + 8, area.y + 3, 30, 16);

            // Sticky notes on whiteboard
            const stickyColors = ['#ffff88', '#ff8888', '#88ff88', '#88ccff'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = stickyColors[i];
                ctx.fillRect(area.x + 10 + i * 7, area.y + 6 + (i % 2) * 5, 5, 5);
            }
        }
    }

    // ---- Kitchen furniture ----
    _drawKitchenFurniture(ctx, area) {
        const cx = area.x + area.w / 2;

        // Counter along top
        ctx.fillStyle = '#8a7060';
        ctx.fillRect(area.x + 5, area.y + 5, area.w - 10, 8);
        ctx.fillStyle = '#d0c8c0';
        ctx.fillRect(area.x + 5, area.y + 5, area.w - 10, 3);

        // Espresso machine
        ctx.fillStyle = '#333';
        ctx.fillRect(area.x + 10, area.y + 2, 12, 8);
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(area.x + 12, area.y + 3, 8, 4);
        // Steam
        ctx.strokeStyle = 'rgba(200,200,200,0.4)';
        ctx.lineWidth = 0.5;
        const steamOffset = Math.sin(this.time * 0.003) * 2;
        ctx.beginPath();
        ctx.moveTo(area.x + 16, area.y + 1);
        ctx.quadraticCurveTo(area.x + 16 + steamOffset, area.y - 4, area.x + 18, area.y - 6);
        ctx.stroke();

        // Fridge
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(area.x + area.w - 20, area.y + 3, 14, 18);
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(area.x + area.w - 20, area.y + 12, 14, 1);
        // Handle
        ctx.fillStyle = '#888';
        ctx.fillRect(area.x + area.w - 8, area.y + 6, 1, 4);

        // Cafe table with stools
        ctx.fillStyle = '#a08060';
        ctx.beginPath();
        ctx.arc(cx, area.y + area.h * 0.65, 10, 0, Math.PI * 2);
        ctx.fill();
        // Stools
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(cx - 14, area.y + area.h * 0.65, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 14, area.y + area.h * 0.65, 4, 0, Math.PI * 2);
        ctx.fill();

        // Fruit bowl
        ctx.fillStyle = '#c8a050';
        ctx.beginPath();
        ctx.ellipse(area.x + 35, area.y + 7, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Fruits
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(area.x + 33, area.y + 5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(area.x + 37, area.y + 5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#44cc44';
        ctx.beginPath();
        ctx.arc(area.x + 35, area.y + 4, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- Lounge furniture ----
    _drawLoungeFurniture(ctx, area) {
        const cx = area.x + area.w / 2;
        const cy = area.y + area.h / 2;

        // Bean bags
        const bbColors = ['#e74c3c', '#3498db', '#f39c12'];
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = bbColors[i];
            ctx.beginPath();
            ctx.ellipse(area.x + 15 + i * 18, area.y + 22, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = shadeColor(bbColors[i], -15);
            ctx.beginPath();
            ctx.ellipse(area.x + 15 + i * 18, area.y + 24, 7, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Curved sofa
        ctx.fillStyle = '#7030a0';
        ctx.beginPath();
        ctx.moveTo(area.x + 8, area.y + area.h - 25);
        ctx.quadraticCurveTo(area.x + area.w * 0.3, area.y + area.h - 32, area.x + area.w * 0.6, area.y + area.h - 25);
        ctx.lineTo(area.x + area.w * 0.6, area.y + area.h - 18);
        ctx.lineTo(area.x + 8, area.y + area.h - 18);
        ctx.closePath();
        ctx.fill();
        // Cushions
        ctx.fillStyle = '#9050c0';
        ctx.beginPath();
        ctx.arc(area.x + 20, area.y + area.h - 22, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(area.x + 35, area.y + area.h - 23, 4, 0, Math.PI * 2);
        ctx.fill();

        // Ping pong table
        ctx.fillStyle = '#1a6030';
        ctx.fillRect(area.x + area.w - 38, cy - 8, 28, 16);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(area.x + area.w - 24, cy - 8);
        ctx.lineTo(area.x + area.w - 24, cy + 8);
        ctx.stroke();
        // Net
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(area.x + area.w - 24, cy - 10);
        ctx.lineTo(area.x + area.w - 24, cy + 10);
        ctx.stroke();

        // Arcade machine
        ctx.fillStyle = '#2a1a3a';
        ctx.fillRect(area.x + area.w - 14, area.y + 8, 10, 18);
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(area.x + area.w - 12, area.y + 10, 6, 6);
        // Joystick area
        ctx.fillStyle = '#444';
        ctx.fillRect(area.x + area.w - 12, area.y + 18, 6, 4);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(area.x + area.w - 9, area.y + 20, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- Bathroom furniture ----
    _drawBathroomFurniture(ctx, area) {
        // Stalls
        for (let i = 0; i < 2; i++) {
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(area.x + 8 + i * 30, area.y + 8, 25, 30);
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.strokeRect(area.x + 8 + i * 30, area.y + 8, 25, 30);
            // Door
            ctx.fillStyle = '#b0b0b0';
            ctx.fillRect(area.x + 12 + i * 30, area.y + 14, 17, 22);
            // Handle
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(area.x + 26 + i * 30, area.y + 25, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Sinks
        ctx.fillStyle = '#d8e8f0';
        ctx.fillRect(area.x + 12, area.y + area.h - 22, 15, 8);
        ctx.fillRect(area.x + 35, area.y + area.h - 22, 15, 8);
        // Faucets
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(area.x + 17, area.y + area.h - 24, 5, 3);
        ctx.fillRect(area.x + 40, area.y + area.h - 24, 5, 3);

        // Small plant
        ctx.fillStyle = '#654321';
        ctx.fillRect(area.x + area.w - 18, area.y + area.h - 18, 6, 5);
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(area.x + area.w - 15, area.y + area.h - 20, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- Manager furniture ----
    _drawManagerFurniture(ctx, area) {
        const cx = area.x + area.w / 2;
        const cy = area.y + area.h / 2;

        // Executive desk (large, dark wood)
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(cx - 25, cy - 10, 50, 20);
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(cx - 24, cy - 9, 48, 3);

        // Dual monitors
        ctx.fillStyle = '#222';
        ctx.fillRect(cx - 18, cy - 22, 14, 10);
        ctx.fillRect(cx + 4, cy - 22, 14, 10);
        ctx.fillStyle = '#2060a0';
        ctx.fillRect(cx - 17, cy - 21, 12, 8);
        ctx.fillRect(cx + 5, cy - 21, 12, 8);
        // Stands
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 12, cy - 12, 2, 3);
        ctx.fillRect(cx + 10, cy - 12, 2, 3);

        // Fancy leather chair
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(cx, cy + 18, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(cx - 7, cy + 10, 14, 6);
        // Chair back (tall)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(cx - 6, cy + 4, 12, 8);

        // HUSTLE neon sign
        ctx.fillStyle = '#ff3366';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 6;
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HUSTLE', cx, area.y + 12);
        ctx.shadowBlur = 0;

        // Trophy
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(area.x + area.w - 15, cy - 5, 4, 6);
        ctx.beginPath();
        ctx.moveTo(area.x + area.w - 16, cy - 5);
        ctx.lineTo(area.x + area.w - 8, cy - 5);
        ctx.lineTo(area.x + area.w - 10, cy - 2);
        ctx.lineTo(area.x + area.w - 14, cy - 2);
        ctx.closePath();
        ctx.fill();
        // Trophy base
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(area.x + area.w - 15, cy + 1, 6, 2);
    }

    // ---- Reception furniture ----
    _drawReceptionFurniture(ctx, area) {
        const cx = area.x + area.w / 2;
        const cy = area.y + area.h / 2;

        // Curved reception desk
        ctx.fillStyle = '#c05080';
        ctx.beginPath();
        ctx.moveTo(cx - 35, cy);
        ctx.quadraticCurveTo(cx - 35, cy - 18, cx, cy - 18);
        ctx.quadraticCurveTo(cx + 35, cy - 18, cx + 35, cy);
        ctx.lineTo(cx + 30, cy + 5);
        ctx.lineTo(cx - 30, cy + 5);
        ctx.closePath();
        ctx.fill();
        // Desk surface
        ctx.fillStyle = shadeColor('#c05080', 15);
        ctx.beginPath();
        ctx.moveTo(cx - 33, cy - 2);
        ctx.quadraticCurveTo(cx, cy - 16, cx + 33, cy - 2);
        ctx.lineTo(cx + 30, cy);
        ctx.lineTo(cx - 30, cy);
        ctx.closePath();
        ctx.fill();

        // Computer on desk
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 8, cy - 12, 10, 7);
        ctx.fillStyle = '#2060a0';
        ctx.fillRect(cx - 7, cy - 11, 8, 5);
        // Keyboard
        ctx.fillStyle = '#444';
        ctx.fillRect(cx - 6, cy - 4, 8, 3);

        // Flowers
        ctx.fillStyle = '#654321';
        ctx.fillRect(cx + 18, cy - 8, 6, 6);
        // Flower petals
        const petalColors = ['#ff6699', '#ff99cc', '#ffccdd'];
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            ctx.fillStyle = petalColors[i % petalColors.length];
            ctx.beginPath();
            ctx.arc(cx + 21 + Math.cos(angle) * 4, cy - 12 + Math.sin(angle) * 4, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        // Center
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(cx + 21, cy - 12, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- Annex furniture (focus pods) ----
    _drawAnnexFurniture(ctx, area) {
        // Focus pods (individual cubicle-like spaces)
        for (let i = 0; i < 3; i++) {
            const px = area.x + 10 + i * 42;
            const py = area.y + 20;

            // Pod walls (3-sided)
            ctx.fillStyle = '#506070';
            ctx.fillRect(px, py, 1, 25);
            ctx.fillRect(px + 30, py, 1, 25);
            ctx.fillRect(px, py, 31, 1);

            // Small desk
            ctx.fillStyle = '#b09070';
            ctx.fillRect(px + 4, py + 8, 23, 3);

            // Lamp
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(px + 22, py + 5, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#888';
            ctx.fillRect(px + 21, py + 6, 2, 3);
        }

        // Bookshelf
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(area.x + area.w - 22, area.y + 10, 16, 55);
        // Shelves
        for (let s = 0; s < 4; s++) {
            ctx.fillStyle = '#7a5a3a';
            ctx.fillRect(area.x + area.w - 21, area.y + 20 + s * 12, 14, 1);
            // Colorful books
            const bookColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
            for (let b = 0; b < 4; b++) {
                ctx.fillStyle = bookColors[(s * 4 + b) % bookColors.length];
                ctx.fillRect(area.x + area.w - 19 + b * 3, area.y + 12 + s * 12, 2.5, 8);
            }
        }
    }

    // ---- Supply closet furniture ----
    _drawSupplyFurniture(ctx, area) {
        // Shelves
        for (let s = 0; s < 3; s++) {
            ctx.fillStyle = '#707070';
            ctx.fillRect(area.x + 5, area.y + 12 + s * 22, area.w - 10, 2);
        }

        // Colorful boxes on shelves
        const boxColors = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6', '#e67e22'];
        for (let s = 0; s < 3; s++) {
            for (let b = 0; b < 2; b++) {
                ctx.fillStyle = boxColors[(s * 2 + b) % boxColors.length];
                ctx.fillRect(area.x + 8 + b * 18, area.y + 3 + s * 22, 12, 9);
                ctx.strokeStyle = shadeColor(boxColors[(s * 2 + b) % boxColors.length], -20);
                ctx.lineWidth = 0.5;
                ctx.strokeRect(area.x + 8 + b * 18, area.y + 3 + s * 22, 12, 9);
            }
        }
    }

    // ---- Warehouse / Game Room furniture ----
    _drawWarehouseFurniture(ctx, area) {
        const cx = area.x + area.w / 2;

        // Stairs
        ctx.fillStyle = '#808080';
        for (let s = 0; s < 5; s++) {
            ctx.fillRect(area.x + 4, area.y + 15 + s * 12, area.w - 8, 3);
            ctx.fillStyle = shadeColor('#808080', -5 * s);
        }

        // Neon arrow pointing down
        const arrowBob = Math.sin(this.time * 0.005) * 3;
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(cx, area.y + 60 + arrowBob);
        ctx.lineTo(cx - 6, area.y + 50 + arrowBob);
        ctx.lineTo(cx - 3, area.y + 50 + arrowBob);
        ctx.lineTo(cx - 3, area.y + 40 + arrowBob);
        ctx.lineTo(cx + 3, area.y + 40 + arrowBob);
        ctx.lineTo(cx + 3, area.y + 50 + arrowBob);
        ctx.lineTo(cx + 6, area.y + 50 + arrowBob);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ---- Hallway furniture ----
    _drawHallwayFurniture(ctx, area) {
        // Carpet runner
        ctx.fillStyle = 'rgba(160, 50, 50, 0.2)';
        ctx.fillRect(area.x + 10, area.y + area.h / 2 - 8, area.w - 20, 16);
        // Carpet border pattern
        ctx.strokeStyle = 'rgba(180, 60, 60, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(area.x + 12, area.y + area.h / 2 - 6, area.w - 24, 12);
        ctx.setLineDash([]);
    }

    // ========== DECORATIONS ==========

    _drawDecorations(ctx, gameTime) {
        this._drawExitSigns(ctx);
        this._drawWallClock(ctx, gameTime);
        this._drawFireExtinguisher(ctx);
        this._drawMotivationalPoster(ctx);
        this._drawWaterCooler(ctx);
    }

    _drawExitSigns(ctx) {
        const signs = [{ x: 40, y: 28 }, { x: CANVAS_W - 65, y: 28 }];
        for (const s of signs) {
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(s.x, s.y, 25, 10);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 6px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('EXIT', s.x + 12.5, s.y + 7.5);
            // Glow
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 3;
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(s.x, s.y, 25, 1);
            ctx.shadowBlur = 0;
        }
    }

    _drawWallClock(ctx, gameTime) {
        const cx = 360, cy = 10, r = 8;
        // Clock face
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Hour marks
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * (r - 2), cy + Math.sin(angle) * (r - 2), 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Hour hand
        const hours = gameTime / 60;
        const hourAngle = ((hours % 12) / 12) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(hourAngle) * (r - 4), cy + Math.sin(hourAngle) * (r - 4));
        ctx.stroke();

        // Minute hand
        const minutes = gameTime % 60;
        const minAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(minAngle) * (r - 2), cy + Math.sin(minAngle) * (r - 2));
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(cx, cy, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawFireExtinguisher(ctx) {
        const x = 28, y = CANVAS_H - 45;
        // Body
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(x, y, 6, 14);
        // Top
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y - 2, 6, 3);
        // Handle
        ctx.fillStyle = '#666';
        ctx.fillRect(x + 5, y - 1, 4, 2);
        // Label
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 1, y + 4, 4, 3);
    }

    _drawMotivationalPoster(ctx) {
        const x = CANVAS_W - 50, y = 160;
        // Frame
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, 22, 28);
        // Image area
        ctx.fillStyle = '#1a3a5a';
        ctx.fillRect(x + 2, y + 2, 18, 16);
        // Mountain
        ctx.fillStyle = '#4a7a9a';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 16);
        ctx.lineTo(x + 11, y + 4);
        ctx.lineTo(x + 20, y + 16);
        ctx.closePath();
        ctx.fill();
        // Snow cap
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 7);
        ctx.lineTo(x + 11, y + 4);
        ctx.lineTo(x + 13, y + 7);
        ctx.closePath();
        ctx.fill();
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = '4px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HANG IN', x + 11, y + 22);
        ctx.fillText('THERE', x + 11, y + 26);
    }

    _drawWaterCooler(ctx) {
        const x = 340, y = CANVAS_H - 50;
        // Base
        ctx.fillStyle = '#ddd';
        ctx.fillRect(x, y + 5, 10, 12);
        // Water jug
        ctx.fillStyle = 'rgba(100, 180, 240, 0.6)';
        ctx.beginPath();
        ctx.arc(x + 5, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60, 140, 200, 0.6)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // Spout
        ctx.fillStyle = '#aaa';
        ctx.fillRect(x + 3, y + 5, 4, 2);
        // Cup holder
        ctx.fillStyle = '#ccc';
        ctx.fillRect(x + 9, y + 8, 3, 4);
    }

    _drawPlants(ctx) {
        for (const p of DECORATIVE_PLANTS) {
            // Pot
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(p.x - 4, p.y, 8, 6);
            ctx.fillStyle = '#6B3310';
            ctx.fillRect(p.x - 5, p.y - 1, 10, 2);
            // Leaves
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.arc(p.x, p.y - 5, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.arc(p.x - 2, p.y - 7, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p.x + 3, p.y - 6, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawHoverHighlight(ctx) {
        if (!this.hoveredArea) return;
        const a = this.hoveredArea;
        ctx.strokeStyle = a.highlight || '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + Math.sin(this.time * 0.005) * 0.2;
        ctx.strokeRect(a.x - 1, a.y - 1, a.w + 2, a.h + 2);
        ctx.globalAlpha = 1.0;
    }

    _updateAndDrawClickEffects(ctx, deltaMs) {
        for (let i = this.clickEffects.length - 1; i >= 0; i--) {
            const e = this.clickEffects[i];
            e.radius += deltaMs * 0.08;
            e.alpha = 1.0 - (e.radius / e.maxRadius);

            if (e.alpha <= 0) {
                this.clickEffects.splice(i, 1);
                continue;
            }

            // Draw expanding ring
            ctx.strokeStyle = `rgba(0, 200, 255, ${e.alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner ring
            ctx.strokeStyle = `rgba(0, 200, 255, ${e.alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ==========================================
    // CHARACTER DRAWING
    // ==========================================

    _drawCharacter(ctx, char, gameClient) {
        const x = char.displayX;
        const y = char.displayY;
        const isSelected = char.id === gameClient.selectedCharId;
        const mood = char.getOverallMood();

        ctx.save();

        // 1. Ground shadow
        this._drawGroundShadow(ctx, x, y);

        // 2. Selection ring
        if (isSelected) {
            this._drawSelectionRing(ctx, x, y);
        }

        // 3. Mood indicator (floating lightning bolt)
        this._drawMoodIndicator(ctx, x, y, mood);

        // 4. Body
        this._drawBody(ctx, x, y, char);

        // 5. Head + face
        this._drawHead(ctx, x, y, char);

        // 6. Name tag
        this._drawNameTag(ctx, x, y, char, isSelected);

        // 7. Speech bubble
        if (char.speechBubble) {
            this._drawSpeechBubble(ctx, x, y, char.speechBubble);
        }

        // 8. Action indicator emoji
        if (char.currentAction) {
            this._drawActionEmoji(ctx, x, y, char.currentAction.id);
        }

        ctx.restore();
    }

    _drawGroundShadow(ctx, x, y) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawSelectionRing(ctx, x, y) {
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 16, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Animated glow
        ctx.strokeStyle = `rgba(46, 204, 113, ${0.3 + Math.sin(this.time * 0.005) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 18, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    _drawMoodIndicator(ctx, x, y, mood) {
        // Color based on mood level
        let color;
        if (mood > 70) color = '#2ecc71';       // green
        else if (mood > 50) color = '#f1c40f';   // yellow
        else if (mood > 35) color = '#e67e22';   // orange
        else if (mood > 20) color = '#e74c3c';   // red
        else color = '#9b59b6';                    // purple

        const bobY = Math.sin(this.time * 0.004) * 2;
        const boltX = x + 14;
        const boltY = y - 42 + bobY;

        // Pulse animation
        const pulse = 1.0 + Math.sin(this.time * 0.006) * 0.15;

        ctx.save();
        ctx.translate(boltX, boltY);
        ctx.scale(pulse, pulse);

        // Lightning bolt shape
        ctx.beginPath();
        ctx.moveTo(-2, -5);
        ctx.lineTo(1, -5);
        ctx.lineTo(0, -1);
        ctx.lineTo(3, -1);
        ctx.lineTo(-1, 5);
        ctx.lineTo(0, 1);
        ctx.lineTo(-3, 1);
        ctx.closePath();

        // Outer glow
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner white core
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(-1, -3);
        ctx.lineTo(0.5, -3);
        ctx.lineTo(-0.2, -0.5);
        ctx.lineTo(1.5, -0.5);
        ctx.lineTo(-0.5, 3);
        ctx.lineTo(0.2, 0.5);
        ctx.lineTo(-1.5, 0.5);
        ctx.closePath();
        ctx.fill();

        // Critical mood flicker
        if (mood < 20) {
            if (Math.random() > 0.5) {
                ctx.globalAlpha = 0.3 + Math.random() * 0.4;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        ctx.restore();
    }

    // ---- Body Drawing ----
    _drawBody(ctx, x, y, char) {
        const skin = char.appearance.skinTone;
        const shirt = char.appearance.shirtColor;
        const pants = char.appearance.pantsColor;
        const isWalking = char.state === 'walking';
        const frame = char.animFrame;
        const facingRight = char.facingRight;

        // Walk cycle offsets
        const walkCycle = isWalking ? Math.sin(frame * Math.PI / 2) : 0;
        const legSwing = walkCycle * 4;
        const armSwing = walkCycle * 5;

        const dir = facingRight ? 1 : -1;

        // === LEGS (stubby) ===
        ctx.fillStyle = pants;
        // Left leg
        ctx.fillRect(x - 5 - legSwing * 0.5, y - 8, 5, 10);
        // Right leg
        ctx.fillRect(x + legSwing * 0.5, y - 8, 5, 10);

        // === SHOES (chunky) ===
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(x - 3 - legSwing * 0.5, y + 1, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 3 + legSwing * 0.5, y + 1, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // === TORSO (blocky) ===
        // Main torso
        ctx.fillStyle = shirt;
        ctx.fillRect(x - 8, y - 24, 16, 17);

        // Shirt shading (darker on sides)
        ctx.fillStyle = shadeColor(shirt, -15);
        ctx.fillRect(x - 8, y - 24, 3, 17);
        ctx.fillRect(x + 5, y - 24, 3, 17);

        // Shirt bottom shade
        ctx.fillStyle = shadeColor(shirt, -10);
        ctx.fillRect(x - 8, y - 10, 16, 3);

        // Collar
        ctx.fillStyle = shadeColor(shirt, 20);
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 24);
        ctx.lineTo(x, y - 21);
        ctx.lineTo(x + 5, y - 24);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = shadeColor(shirt, 30);
        ctx.stroke();

        // === ARMS (stubby with swing) ===
        ctx.fillStyle = shirt;
        // Left arm
        ctx.save();
        ctx.translate(x - 8, y - 22);
        ctx.rotate((-armSwing * dir) * Math.PI / 180 * 3);
        ctx.fillRect(-4, 0, 5, 12);
        // Left hand
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(-1.5, 13, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right arm
        ctx.fillStyle = shirt;
        ctx.save();
        ctx.translate(x + 8, y - 22);
        ctx.rotate((armSwing * dir) * Math.PI / 180 * 3);
        ctx.fillRect(-1, 0, 5, 12);
        // Right hand
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(1.5, 13, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // === SHORT THICK NECK ===
        ctx.fillStyle = skin;
        ctx.fillRect(x - 3, y - 27, 6, 4);
    }

    // ---- Head + Face Drawing ----
    _drawHead(ctx, x, y, char) {
        const skin = char.appearance.skinTone;
        const hairColor = char.appearance.hairColor;
        const hairStyle = char.appearance.hairStyle;
        const eyeColor = char.appearance.eyeColor;
        const expression = char.expression;
        const facingRight = char.facingRight;

        const headY = y - 40;
        const headRX = 11;
        const headRY = 10;

        // === BIG SIMS HEAD (ellipse) ===
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.ellipse(x, headY, headRX, headRY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Face shape overlay (slightly lighter on forehead)
        ctx.fillStyle = shadeColor(skin, 5);
        ctx.beginPath();
        ctx.ellipse(x, headY - 2, headRX - 1, headRY - 3, 0, 0, Math.PI);
        ctx.fill();

        // Cheeks
        ctx.fillStyle = shadeColor(skin, 8);
        ctx.beginPath();
        ctx.ellipse(x - 6, headY + 2, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 6, headY + 2, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.ellipse(x - headRX, headY, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + headRX, headY, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner ear
        ctx.fillStyle = shadeColor(skin, -10);
        ctx.beginPath();
        ctx.ellipse(x - headRX, headY, 1.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + headRX, headY, 1.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // === HAIR ===
        this._drawHair(ctx, x, headY, headRX, headRY, hairColor, hairStyle);

        // === EYES ===
        this._drawEyes(ctx, x, headY, eyeColor, expression, facingRight, char);

        // === EYEBROWS ===
        this._drawEyebrows(ctx, x, headY, expression, hairColor);

        // === NOSE ===
        this._drawNose(ctx, x, headY, skin);

        // === MOUTH ===
        this._drawMouth(ctx, x, headY, expression);

        // === BLUSH ===
        if (expression === 'excitement' || expression === 'happiness') {
            ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
            ctx.beginPath();
            ctx.ellipse(x - 6, headY + 3, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x + 6, headY + 3, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // === FACE SHINE ===
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.ellipse(x - 3, headY - 4, 4, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawHair(ctx, x, headY, headRX, headRY, hairColor, hairStyle) {
        ctx.fillStyle = hairColor;

        switch (hairStyle) {
            case 'spiky': {
                // Base hair mass
                ctx.beginPath();
                ctx.ellipse(x, headY - 4, headRX + 1, headRY - 2, 0, Math.PI, Math.PI * 2);
                ctx.fill();

                // 9 spikes
                for (let i = 0; i < 9; i++) {
                    const angle = Math.PI + (i / 8) * Math.PI;
                    const spikeLen = 5 + (i % 3) * 2;
                    const bx = x + Math.cos(angle) * (headRX + 1);
                    const by = headY - 4 + Math.sin(angle) * (headRY - 2);
                    const tx = x + Math.cos(angle) * (headRX + spikeLen);
                    const ty = headY - 4 + Math.sin(angle) * (headRY - 2 + spikeLen * 0.6);

                    ctx.beginPath();
                    ctx.moveTo(bx - 2, by);
                    ctx.lineTo(tx, ty);
                    ctx.lineTo(bx + 2, by);
                    ctx.closePath();
                    ctx.fill();
                }

                // Side hair
                ctx.fillRect(x - headRX - 1, headY - 6, 3, 6);
                ctx.fillRect(x + headRX - 2, headY - 6, 3, 6);
                break;
            }

            case 'bob': {
                // Dome
                ctx.beginPath();
                ctx.ellipse(x, headY - 3, headRX + 2, headRY, 0, Math.PI, Math.PI * 2);
                ctx.fill();

                // Sides
                ctx.fillRect(x - headRX - 2, headY - 5, 4, 12);
                ctx.fillRect(x + headRX - 2, headY - 5, 4, 12);

                // Bangs
                ctx.fillStyle = shadeColor(hairColor, 5);
                ctx.beginPath();
                ctx.moveTo(x - 8, headY - 8);
                ctx.quadraticCurveTo(x, headY - 4, x + 8, headY - 8);
                ctx.lineTo(x + 8, headY - 6);
                ctx.quadraticCurveTo(x, headY - 2, x - 8, headY - 6);
                ctx.closePath();
                ctx.fill();

                // Shine
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.beginPath();
                ctx.ellipse(x - 3, headY - 8, 3, 2, -0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'long': {
                // Dome
                ctx.beginPath();
                ctx.ellipse(x, headY - 3, headRX + 2, headRY, 0, Math.PI, Math.PI * 2);
                ctx.fill();

                // Flowing sides (long hair below shoulders)
                ctx.fillRect(x - headRX - 2, headY - 5, 4, 22);
                ctx.fillRect(x + headRX - 2, headY - 5, 4, 22);

                // Rounded bottom
                ctx.beginPath();
                ctx.ellipse(x - headRX, headY + 15, 3, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x + headRX, headY + 15, 3, 3, 0, 0, Math.PI * 2);
                ctx.fill();

                // Shine
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.beginPath();
                ctx.ellipse(x - 4, headY - 7, 3, 2, -0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'short': {
                // Dome
                ctx.beginPath();
                ctx.ellipse(x, headY - 4, headRX + 1, headRY - 1, 0, Math.PI, Math.PI * 2);
                ctx.fill();

                // Texture lines (short cropped look)
                ctx.strokeStyle = shadeColor(hairColor, -10);
                ctx.lineWidth = 0.5;
                for (let i = 0; i < 8; i++) {
                    const angle = Math.PI + (i / 7) * Math.PI;
                    const sx = x + Math.cos(angle) * (headRX - 2);
                    const sy = headY - 4 + Math.sin(angle) * (headRY - 3);
                    const ex = x + Math.cos(angle) * (headRX + 1);
                    const ey = headY - 4 + Math.sin(angle) * (headRY - 1);
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(ex, ey);
                    ctx.stroke();
                }
                break;
            }

            case 'curly': {
                // Curly hair: 12-point ring pattern, two layers
                // Outer ring
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const cx2 = x + Math.cos(angle) * (headRX + 2);
                    const cy2 = headY - 2 + Math.sin(angle) * (headRY + 1);
                    ctx.beginPath();
                    ctx.arc(cx2, cy2, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Inner ring (slightly lighter)
                ctx.fillStyle = shadeColor(hairColor, 8);
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2 + Math.PI / 12;
                    const cx2 = x + Math.cos(angle) * (headRX - 1);
                    const cy2 = headY - 3 + Math.sin(angle) * (headRY - 2);
                    ctx.beginPath();
                    ctx.arc(cx2, cy2, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }

            case 'bald': {
                // Just a shine highlight on the head
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.ellipse(x - 2, headY - 6, 5, 3, -0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'receding': {
                // Top curve (partial coverage)
                ctx.beginPath();
                ctx.moveTo(x - 4, headY - headRY + 1);
                ctx.quadraticCurveTo(x, headY - headRY - 2, x + 4, headY - headRY + 1);
                ctx.lineTo(x + 5, headY - headRY + 3);
                ctx.quadraticCurveTo(x, headY - headRY, x - 5, headY - headRY + 3);
                ctx.closePath();
                ctx.fill();

                // Side hair (still has hair on sides)
                ctx.fillRect(x - headRX - 1, headY - 4, 3, 8);
                ctx.fillRect(x + headRX - 2, headY - 4, 3, 8);
                break;
            }

            default: {
                // Fallback: short
                ctx.beginPath();
                ctx.ellipse(x, headY - 4, headRX + 1, headRY - 1, 0, Math.PI, Math.PI * 2);
                ctx.fill();
                break;
            }
        }
    }

    _drawEyes(ctx, x, headY, eyeColor, expression, facingRight, char) {
        const eyeOffsetX = 5;
        const eyeY = headY - 1;
        const working = char.state === 'working';

        for (let side = -1; side <= 1; side += 2) {
            const ex = x + side * eyeOffsetX;

            // White of eye (BIG ellipse)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, 4, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Eye outline
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.ellipse(ex, eyeY, 4, 3.5, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Look direction offset
            let lookX = 0;
            let lookY = 0;
            if (facingRight) lookX = 1;
            else lookX = -1;
            if (working) lookY = 1; // Looking down at work

            // Colorful iris
            ctx.fillStyle = eyeColor;
            ctx.beginPath();
            ctx.arc(ex + lookX, eyeY + lookY, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Iris detail ring
            ctx.strokeStyle = shadeColor(eyeColor, -20);
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.arc(ex + lookX, eyeY + lookY, 1.8, 0, Math.PI * 2);
            ctx.stroke();

            // Pupil
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(ex + lookX, eyeY + lookY, 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Sparkles (2 per eye)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex + lookX - 0.8, eyeY + lookY - 1, 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex + lookX + 0.5, eyeY + lookY + 0.5, 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Eyelashes for feminine characters (long/bob/curly hair)
            const feminineHair = ['long', 'bob', 'curly'];
            if (feminineHair.includes(char.appearance.hairStyle)) {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 0.8;
                // Upper lashes
                for (let l = 0; l < 3; l++) {
                    const angle = Math.PI + (l / 2 - 0.5) * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(ex + Math.cos(angle) * 3.5, eyeY + Math.sin(angle) * 3);
                    ctx.lineTo(ex + Math.cos(angle) * 5, eyeY + Math.sin(angle) * 4);
                    ctx.stroke();
                }
            }
        }
    }

    _drawEyebrows(ctx, x, headY, expression, hairColor) {
        ctx.strokeStyle = shadeColor(hairColor, 10);
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        const browY = headY - 5;

        switch (expression) {
            case 'anger': {
                // V-shaped angry brows
                // Left brow: angled down toward center
                ctx.beginPath();
                ctx.moveTo(x - 8, browY - 1);
                ctx.lineTo(x - 3, browY + 2);
                ctx.stroke();
                // Right brow
                ctx.beginPath();
                ctx.moveTo(x + 8, browY - 1);
                ctx.lineTo(x + 3, browY + 2);
                ctx.stroke();
                break;
            }
            case 'sadness': {
                // Droopy brows
                ctx.beginPath();
                ctx.moveTo(x - 8, browY + 1);
                ctx.quadraticCurveTo(x - 5, browY - 1, x - 2, browY + 1);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + 8, browY + 1);
                ctx.quadraticCurveTo(x + 5, browY - 1, x + 2, browY + 1);
                ctx.stroke();
                break;
            }
            default: {
                // Arched (default/neutral)
                ctx.beginPath();
                ctx.moveTo(x - 8, browY);
                ctx.quadraticCurveTo(x - 5, browY - 2, x - 2, browY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + 8, browY);
                ctx.quadraticCurveTo(x + 5, browY - 2, x + 2, browY);
                ctx.stroke();
                break;
            }
        }

        ctx.lineCap = 'butt';
    }

    _drawNose(ctx, x, headY, skin) {
        const noseY = headY + 2;

        // Nose shape
        ctx.fillStyle = shadeColor(skin, -8);
        ctx.beginPath();
        ctx.moveTo(x, noseY - 2);
        ctx.quadraticCurveTo(x + 2, noseY + 1, x + 1, noseY + 2);
        ctx.lineTo(x - 1, noseY + 2);
        ctx.quadraticCurveTo(x - 2, noseY + 1, x, noseY - 2);
        ctx.fill();

        // Nose highlight
        ctx.fillStyle = shadeColor(skin, 10);
        ctx.beginPath();
        ctx.arc(x, noseY - 1, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Nostrils
        ctx.fillStyle = shadeColor(skin, -20);
        ctx.beginPath();
        ctx.arc(x - 1.2, noseY + 1.5, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 1.2, noseY + 1.5, 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawMouth(ctx, x, headY, expression) {
        const mouthY = headY + 5;

        switch (expression) {
            case 'happiness':
            case 'excitement': {
                // Smile with teeth
                ctx.fillStyle = '#cc3333';
                ctx.beginPath();
                ctx.arc(x, mouthY, 3.5, 0, Math.PI);
                ctx.fill();
                // Teeth
                ctx.fillStyle = '#fff';
                ctx.fillRect(x - 3, mouthY, 6, 2);
                // Upper lip line
                ctx.strokeStyle = shadeColor('#cc3333', -20);
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(x, mouthY, 3.5, Math.PI, Math.PI * 2);
                ctx.stroke();
                break;
            }
            case 'sadness': {
                // Frown
                ctx.strokeStyle = '#8a4a4a';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(x, mouthY + 4, 3.5, Math.PI + 0.5, Math.PI * 2 - 0.5);
                ctx.stroke();
                break;
            }
            case 'anger': {
                // Grimace (tight wavy line)
                ctx.strokeStyle = '#8a3a3a';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x - 4, mouthY);
                ctx.lineTo(x - 2, mouthY + 1);
                ctx.lineTo(x, mouthY - 0.5);
                ctx.lineTo(x + 2, mouthY + 1);
                ctx.lineTo(x + 4, mouthY);
                ctx.stroke();
                // Teeth peeking through
                ctx.fillStyle = '#fff';
                ctx.fillRect(x - 2, mouthY - 0.5, 4, 1.5);
                break;
            }
            case 'anxiety': {
                // Small O shape
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.ellipse(x, mouthY + 1, 2.5, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#5a2a2a';
                ctx.beginPath();
                ctx.ellipse(x, mouthY + 1, 1.8, 2.2, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'boredom': {
                // Flat line, slightly droopy
                ctx.strokeStyle = '#8a6a6a';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(x - 3, mouthY);
                ctx.lineTo(x + 3, mouthY + 0.5);
                ctx.stroke();
                break;
            }
            default: {
                // Neutral/pleasant — slight smile
                ctx.strokeStyle = '#8a5a5a';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(x, mouthY - 1, 3, 0.2, Math.PI - 0.2);
                ctx.stroke();
                break;
            }
        }
    }

    _drawNameTag(ctx, x, y, char, isSelected) {
        const tagY = y + 8;
        const name = char.name;

        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        const textW = ctx.measureText(name).width;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        const pad = 3;
        ctx.fillRect(x - textW / 2 - pad, tagY - 7, textW + pad * 2, 10);

        // Text color: cyan for player, light for NPC
        ctx.fillStyle = char.isPlayer ? '#00e5ff' : '#d0d0d0';
        ctx.fillText(name, x, tagY);
    }

    _drawSpeechBubble(ctx, x, y, text) {
        const bubbleY = y - 62;
        ctx.font = '7px Arial';
        ctx.textAlign = 'center';
        const textW = Math.min(ctx.measureText(text).width, 100);
        const bubbleW = textW + 12;
        const bubbleH = 16;
        const bx = x - bubbleW / 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.moveTo(bx + 4, bubbleY + 3);
        ctx.lineTo(bx + bubbleW + 2, bubbleY + 3);
        ctx.quadraticCurveTo(bx + bubbleW + 4, bubbleY + 3, bx + bubbleW + 4, bubbleY + 5);
        ctx.lineTo(bx + bubbleW + 4, bubbleY + bubbleH + 3);
        ctx.quadraticCurveTo(bx + bubbleW + 4, bubbleY + bubbleH + 5, bx + bubbleW + 2, bubbleY + bubbleH + 5);
        ctx.lineTo(bx + 4, bubbleY + bubbleH + 5);
        ctx.quadraticCurveTo(bx + 2, bubbleY + bubbleH + 5, bx + 2, bubbleY + bubbleH + 3);
        ctx.lineTo(bx + 2, bubbleY + 5);
        ctx.quadraticCurveTo(bx + 2, bubbleY + 3, bx + 4, bubbleY + 3);
        ctx.closePath();
        ctx.fill();

        // Bubble body
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bx + 3, bubbleY);
        ctx.lineTo(bx + bubbleW - 3, bubbleY);
        ctx.quadraticCurveTo(bx + bubbleW, bubbleY, bx + bubbleW, bubbleY + 3);
        ctx.lineTo(bx + bubbleW, bubbleY + bubbleH - 3);
        ctx.quadraticCurveTo(bx + bubbleW, bubbleY + bubbleH, bx + bubbleW - 3, bubbleY + bubbleH);
        ctx.lineTo(bx + 3, bubbleY + bubbleH);
        ctx.quadraticCurveTo(bx, bubbleY + bubbleH, bx, bubbleY + bubbleH - 3);
        ctx.lineTo(bx, bubbleY + 3);
        ctx.quadraticCurveTo(bx, bubbleY, bx + 3, bubbleY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pointer (triangle pointing down)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(x - 4, bubbleY + bubbleH);
        ctx.lineTo(x, bubbleY + bubbleH + 6);
        ctx.lineTo(x + 4, bubbleY + bubbleH);
        ctx.closePath();
        ctx.fill();
        // Pointer outline
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x - 4, bubbleY + bubbleH);
        ctx.lineTo(x, bubbleY + bubbleH + 6);
        ctx.lineTo(x + 4, bubbleY + bubbleH);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#333';
        ctx.font = '7px Arial';
        ctx.textAlign = 'center';
        // Truncate long text
        let displayText = text;
        if (ctx.measureText(text).width > 100) {
            while (ctx.measureText(displayText + '...').width > 100 && displayText.length > 0) {
                displayText = displayText.slice(0, -1);
            }
            displayText += '...';
        }
        ctx.fillText(displayText, x, bubbleY + bubbleH / 2 + 3);
    }

    _drawActionEmoji(ctx, x, y, actionId) {
        const emoji = ACTION_EMOJIS[actionId];
        if (!emoji) return;

        const emojiY = y - 55 + Math.sin(this.time * 0.003) * 2;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(emoji, x - 14, emojiY);
    }
}
