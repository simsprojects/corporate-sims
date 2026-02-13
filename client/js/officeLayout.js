/**
 * Office area definitions — positions, types, and colors.
 * Shared between server (for area detection) and client (for rendering).
 */
export const OFFICE_AREAS = [
    // Open Workspace Pods
    { id: 'cubicle1', type: 'cubicle', name: 'Green Pod', x: 30, y: 220, w: 95, h: 85, color: '#2d5a4a', highlight: '#3d7a6a', interactive: true },
    { id: 'cubicle2', type: 'cubicle', name: 'Blue Pod', x: 135, y: 220, w: 95, h: 85, color: '#2a4a6a', highlight: '#3a6a9a', interactive: true },
    { id: 'cubicle3', type: 'cubicle', name: 'Orange Pod', x: 240, y: 220, w: 95, h: 85, color: '#6a4a2a', highlight: '#9a6a3a', interactive: true },
    { id: 'cubicle4', type: 'cubicle', name: 'Purple Pod', x: 30, y: 315, w: 95, h: 85, color: '#4a3a5a', highlight: '#6a5a8a', interactive: true },
    { id: 'cubicle5', type: 'cubicle', name: 'Teal Pod', x: 135, y: 315, w: 95, h: 85, color: '#2a5a5a', highlight: '#3a8a8a', interactive: true },
    { id: 'cubicle6', type: 'cubicle', name: 'Red Pod', x: 240, y: 315, w: 95, h: 85, color: '#5a2a3a', highlight: '#8a4a5a', interactive: true },

    // Meeting Spaces
    { id: 'conference', type: 'meeting', name: 'Brainstorm Room', x: 30, y: 30, w: 120, h: 85, color: '#e07030', highlight: '#ff9050', interactive: true },
    { id: 'meeting_small', type: 'meeting', name: 'Think Tank', x: 160, y: 30, w: 90, h: 85, color: '#30a080', highlight: '#40c0a0', interactive: true },
    { id: 'meeting_phone', type: 'meeting', name: 'Phone Booth', x: 260, y: 30, w: 55, h: 85, color: '#3080c0', highlight: '#40a0e0', interactive: true },

    // CEO Corner
    { id: 'manager_office', type: 'manager', name: 'CEO Corner', x: 325, y: 30, w: 100, h: 85, color: '#2a3a4a', highlight: '#3a5a7a', interactive: true },

    // Kitchen
    { id: 'kitchen', type: 'kitchen', name: 'Cafe', x: 435, y: 30, w: 110, h: 85, color: '#8a5030', highlight: '#aa7050', interactive: true },

    // Quiet Zone
    { id: 'annex', type: 'annex', name: 'Quiet Zone', x: 555, y: 30, w: 135, h: 85, color: '#405060', highlight: '#607080', interactive: true },

    // Reception
    { id: 'reception', type: 'reception', name: 'Welcome Hub', x: 550, y: 220, w: 140, h: 85, color: '#c05080', highlight: '#e070a0', interactive: true },

    // Lounge
    { id: 'lounge', type: 'lounge', name: 'Fun Zone', x: 550, y: 315, w: 140, h: 85, color: '#7030a0', highlight: '#9050c0', interactive: true },

    // Bathroom
    { id: 'bathroom', type: 'bathroom', name: 'Wellness', x: 345, y: 315, w: 85, h: 85, color: '#40a0c0', highlight: '#60c0e0', interactive: true },

    // Storage
    { id: 'supply', type: 'supply', name: 'Storage', x: 440, y: 315, w: 50, h: 85, color: '#505050', highlight: '#707070', interactive: true },

    // Game Room
    { id: 'warehouse', type: 'warehouse', name: 'Game Room', x: 500, y: 315, w: 40, h: 85, color: '#a04080', highlight: '#c060a0', interactive: true },

    // Corridors
    { id: 'hallway1', type: 'hallway', name: 'Main Corridor', x: 30, y: 125, w: 660, h: 85, color: '#c0a080' },
    { id: 'hallway2', type: 'hallway', name: 'Side Corridor', x: 345, y: 220, w: 195, h: 85, color: '#c0a080' }
];

export function findAreaAt(x, y) {
    for (const area of OFFICE_AREAS) {
        if (x >= area.x && x <= area.x + area.w &&
            y >= area.y && y <= area.y + area.h) {
            return area;
        }
    }
    return null;
}

export function getAreasByType(type) {
    return OFFICE_AREAS.filter(a => a.type === type);
}

export function getRandomPointInArea(area) {
    return {
        x: area.x + 10 + Math.random() * (area.w - 20),
        y: area.y + 10 + Math.random() * (area.h - 20)
    };
}
