import * as THREE from 'three';

/**
 * Simple and reliable aircraft controls
 */
export class AircraftControls {
    constructor() {
        this.keys = {};
        this.setupEventListeners();
        
        // Control sensitivity
        this.pitchSensitivity = 0.01;
        this.yawSensitivity = 0.01;
        this.rollSensitivity = 0.02;
        this.throttleSensitivity = 0.02;
        
        console.log('Aircraft controls initialized');
    }
    
    setupEventListeners() {
        // Make sure the page can receive keyboard focus
        document.body.setAttribute('tabindex', '0');
        document.body.focus();
        
        // Keyboard event listeners
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            console.log('Control key pressed:', event.code); // Debug
            
            // Prevent default for WASD and Space to avoid page scrolling
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
                event.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
            console.log('Control key released:', event.code); // Debug
        });
        
        // Also add focus events to ensure we're listening
        window.addEventListener('focus', () => {
            console.log('Window gained focus');
        });
        
        window.addEventListener('blur', () => {
            console.log('Window lost focus');
        });
        
        console.log('Event listeners set up');
    }
    
    /**
     * Get current input state for aircraft
     * @returns {Object} Input state with throttle, pitch, yaw, roll
     */
    getInputState() {
        const isBoosting = this.keys['Space'];
        const boostMultiplier = isBoosting ? 1.5 : 1.0;
        
        const input = {
            throttle: 0,
            pitch: 0,
            yaw: 0,
            roll: 0
        };
        
        // Throttle (W = forward, S = reverse/brake)
        if (this.keys['KeyW']) {
            input.throttle = 1.0 * boostMultiplier;
        } else if (this.keys['KeyS']) {
            input.throttle = -0.5;
        }
        
        // Pitch (W/S also affect pitch for realistic flight)
        if (this.keys['KeyW']) {
            input.pitch = -0.3; // Nose down for speed
        } else if (this.keys['KeyS']) {
            input.pitch = 0.3; // Nose up for climb/brake
        }
        
        // Yaw (A/D for turning)
        if (this.keys['KeyA']) {
            input.yaw = -1.0; // Turn left
        } else if (this.keys['KeyD']) {
            input.yaw = 1.0; // Turn right
        }
        
        // Roll (A/D also add banking for realistic turns)
        if (this.keys['KeyA']) {
            input.roll = 0.5; // Bank left
        } else if (this.keys['KeyD']) {
            input.roll = -0.5; // Bank right
        }
        
        // Debug: Log occasionally
        if (Math.random() < 0.01 && (input.throttle !== 0 || input.pitch !== 0 || input.yaw !== 0 || input.roll !== 0)) {
            console.log('Control input:', input);
        }
        
        return input;
    }
    
    /**
     * Check if any control keys are pressed
     * @returns {boolean}
     */
    hasInput() {
        return this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'] || this.keys['Space'];
    }
    
    /**
     * Get pressed keys for debugging
     * @returns {Array}
     */
    getPressedKeys() {
        return Object.keys(this.keys).filter(key => this.keys[key]);
    }
}

/**
 * Alternative simpler control setup function (like your example)
 * @param {Object} aircraftSystem - The aircraft system object
 */
export function setupSimpleControls(aircraftSystem) {
    const keys = {
        KeyW: false,
        KeyS: false,
        KeyA: false,
        KeyD: false,
        Space: false
    };
    
    // Control parameters
    const pitchSpeed = 0.02;
    const yawSpeed = 0.02;
    const rollSpeed = 0.03;
    const throttleSpeed = 1.0;
    
    function updateControls() {
        if (!aircraftSystem || !aircraftSystem.aircraft) return;
        
        const input = {
            throttle: 0,
            pitch: 0,
            yaw: 0,
            roll: 0
        };
        
        // Calculate inputs based on pressed keys
        if (keys.KeyW) {
            input.throttle = throttleSpeed;
            input.pitch = -pitchSpeed; // Nose down
        }
        if (keys.KeyS) {
            input.throttle = -0.5;
            input.pitch = pitchSpeed; // Nose up
        }
        if (keys.KeyA) {
            input.yaw = -yawSpeed;
            input.roll = rollSpeed; // Bank left
        }
        if (keys.KeyD) {
            input.yaw = yawSpeed;
            input.roll = -rollSpeed; // Bank right
        }
        if (keys.Space) {
            input.throttle *= 1.5; // Boost
        }
        
        // Apply inputs directly to aircraft system
        aircraftSystem.controls.throttle = input.throttle;
        aircraftSystem.controls.pitch = input.pitch;
        aircraftSystem.controls.yaw = input.yaw;
        aircraftSystem.controls.roll = input.roll;
        
        // Debug
        if (input.throttle !== 0 || input.pitch !== 0) {
            console.log('Simple controls active:', input);
        }
    }
    
    // Event listeners
    document.addEventListener('keydown', (event) => {
        if (event.code in keys) {
            keys[event.code] = true;
            updateControls();
            console.log('Simple control pressed:', event.code);
        }
    });
    
    document.addEventListener('keyup', (event) => {
        if (event.code in keys) {
            keys[event.code] = false;
            updateControls();
            console.log('Simple control released:', event.code);
        }
    });
    
    console.log('Simple controls setup complete');
}
