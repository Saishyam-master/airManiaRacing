/**
 * Simple and reliable aircraft controls
 */
export class AircraftControls {
    constructor() {
        this.keys = {};
        this.debug = false; // Debug flag for console logging
        this.setupEventListeners();
        
        // Control sensitivity values - now used in input calculations
        this.pitchSensitivity = 0.3;
        this.yawSensitivity = 1.0;
        this.rollSensitivity = 0.5;
        this.throttleSensitivity = 1.0;
        
        if (this.debug) console.log('Aircraft controls initialized');
    }
    
    setupEventListeners() {
        // Keyboard event listeners
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            if (this.debug) console.log('Control key pressed:', event.code);
            
            // Prevent default for WASD, Space, Arrow keys, and R key to avoid page scrolling
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'KeyR'].includes(event.code)) {
                event.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
            if (this.debug) console.log('Control key released:', event.code);
        });
        
        // Focus events for debugging only
        if (this.debug) {
            window.addEventListener('focus', () => {
                console.log('Window gained focus');
            });
            
            window.addEventListener('blur', () => {
                console.log('Window lost focus');
            });
        }
        
        if (this.debug) console.log('Event listeners set up');
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
        
        // Throttle (W = forward, S = reverse/brake) - apply sensitivity
        if (this.keys['KeyW']) {
            input.throttle = 1.0 * boostMultiplier * this.throttleSensitivity;
        } else if (this.keys['KeyS']) {
            input.throttle = -0.5 * this.throttleSensitivity;
        }
        
        // Arrow Key Pitch Controls (dedicated pitch control) - apply sensitivity
        if (this.keys['ArrowUp']) {
            input.pitch = -0.8 * this.pitchSensitivity; // Nose up (negative pitch)
        } else if (this.keys['ArrowDown']) {
            input.pitch = 0.8 * this.pitchSensitivity; // Nose down (positive pitch)
        }
        
        // Yaw (A/D for turning) - apply sensitivity
        if (this.keys['KeyA']) {
            input.yaw = -1.0 * this.yawSensitivity; // Turn left
        } else if (this.keys['KeyD']) {
            input.yaw = 1.0 * this.yawSensitivity; // Turn right
        }
        
        // Roll (A/D for banking) - CORRECTED: A is positive roll, D is negative roll
        if (this.keys['KeyA']) {
            input.roll = 0.5 * this.rollSensitivity; // Bank left (positive)
        } else if (this.keys['KeyD']) {
            input.roll = -0.5 * this.rollSensitivity; // Bank right (negative)
        }
        
        // Reset functionality
        if (this.keys['KeyR']) {
            input.reset = true;
        }
        
        return input;
    }
    
    /**
     * Check if any control keys are pressed
     * @returns {boolean}
     */
    hasInput() {
        return this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'] || this.keys['Space'] || this.keys['ArrowUp'] || this.keys['ArrowDown'] || this.keys['KeyR'];
    }
    
    /**
     * Get pressed keys for debugging
     * @returns {Array}
     */
    getPressedKeys() {
        return Object.keys(this.keys).filter(key => this.keys[key]);
    }
    
    /**
     * Simulate key press for testing (proper encapsulation)
     * @param {string} keyCode - The key code to simulate
     */
    simulateKeyPress(keyCode) {
        this.keys[keyCode] = true;
        if (this.debug) console.log('Simulated key press:', keyCode);
    }
    
    /**
     * Simulate key release for testing (proper encapsulation)
     * @param {string} keyCode - The key code to simulate
     */
    simulateKeyRelease(keyCode) {
        this.keys[keyCode] = false;
        if (this.debug) console.log('Simulated key release:', keyCode);
    }
    
    /**
     * Enable or disable debug logging
     * @param {boolean} enabled - Whether to enable debug logging
     */
    setDebug(enabled) {
        this.debug = enabled;
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
            input.roll = -rollSpeed; // FIXED: Bank left (negative)
        }
        if (keys.KeyD) {
            input.yaw = yawSpeed;
            input.roll = rollSpeed; // FIXED: Bank right (positive)
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
