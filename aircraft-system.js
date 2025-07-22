import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AircraftSystem {
    constructor(scene, environment) {
        this.scene = scene;
        this.environment = environment;
        this.aircraft = null;
        this.aircraftModel = null;
        
        // Aircraft physics properties
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        
        // Flight parameters
        this.thrust = 0;
        this.maxThrust = 10000; // Increased from 5000 for much faster movement
        this.drag = 0.985; // Slightly reduced drag for more speed
        this.lift = 0;
        this.gravity = -1.5; // Further reduced gravity for easier flight
        this.mass = 1000;
        
        // Control parameters - realistic flight model
        this.pitchSensitivity = 0.08; // Increased for responsive arrow key pitch control
        this.yawSensitivity = 0.02; // Reduced for more realistic rudder authority
        this.rollSensitivity = 0.05; // Increased for responsive banking
        
        // Advanced flight dynamics
        this.bankAngle = 0; // Current bank angle in radians
        this.turnRate = 0; // Current turn rate
        this.gForce = 1.0; // Current G-force
        this.stallSpeed = 50; // Speed below which aircraft becomes unstable
        this.maxBankAngle = Math.PI * 0.7; // Maximum safe bank angle (about 125 degrees)
        
        // Aerodynamic coefficients
        this.liftCoefficient = 0.8;
        this.dragCoefficient = 0.03;
        this.stallAngle = Math.PI / 6; // 30 degrees angle of attack causes stall
        
        // Aircraft state
        this.isEngineOn = false;
        this.speed = 0;
        this.altitude = 0;
        this.crashed = false; // NEW: Track crash state to prevent movement
        
        // Controls state
        this.controls = {
            throttle: 0,
            pitch: 0,
            yaw: 0,
            roll: 0
        };
        
        console.log('Aircraft system initialized');
    }

    async init() {
        try {
            console.log('Loading aircraft model...');
            await this.loadAircraftModel();
            this.positionAircraft();
            this.createAircraftLights();
            console.log('Aircraft system ready');
        } catch (error) {
            console.error('Error initializing aircraft:', error);
        }
    }

    async loadAircraftModel() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(
                'visuals/airManiaJet.glb',
                (gltf) => {
                    this.aircraftModel = gltf.scene;
                    
                    // Scale the aircraft much smaller for grander world appearance
                    this.aircraftModel.scale.setScalar(1); // Reduced from 3 to 1 (much smaller)
                    
                    // Fix the model's orientation - GLB models often face the wrong way
                    console.log('Original model rotation:', this.aircraftModel.rotation);
                    
                    // Rotate the model to face forward correctly
                    this.aircraftModel.rotation.y = Math.PI/2; // 90 degree turn to face forward
                    
                    // Create aircraft group for easier manipulation
                    this.aircraft = new THREE.Group();
                    this.aircraft.add(this.aircraftModel);
                    
                    // Enable shadows
                    this.aircraftModel.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    this.scene.add(this.aircraft);
                    console.log('Aircraft model loaded successfully');
                    resolve();
                },
                (progress) => {
                    console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('Error loading aircraft model:', error);
                    reject(error);
                }
            );
        });
    }

    positionAircraft() {
        if (!this.aircraft) return;
        
        // Get corner spawn position from environment
        const spawnPosition = this.environment.getCornerSpawnPosition();
        this.aircraft.position.copy(spawnPosition);
        
        // Set initial rotation facing forward (same direction as camera will follow)
        // Point toward center of terrain but in a forward-facing orientation
        this.aircraft.rotation.y = Math.PI * 0.25; // 45 degrees toward center
        this.aircraft.rotation.x = 0; // Level flight
        this.aircraft.rotation.z = 0; // No roll
        
        console.log(`Aircraft positioned at: x=${spawnPosition.x.toFixed(2)}, y=${spawnPosition.y.toFixed(2)}, z=${spawnPosition.z.toFixed(2)}`);
    }

    createAircraftLights() {
        if (!this.aircraft) return;
        
        // Navigation lights scaled for smaller aircraft
        const leftWingLight = new THREE.PointLight(0xff0000, 0.3, 50); // Red - smaller intensity and range
        leftWingLight.position.set(-2, 0, 0); // Closer to aircraft center
        this.aircraft.add(leftWingLight);
        
        const rightWingLight = new THREE.PointLight(0x00ff00, 0.3, 50); // Green - smaller intensity and range
        rightWingLight.position.set(2, 0, 0); // Closer to aircraft center
        this.aircraft.add(rightWingLight);
        
        const tailLight = new THREE.PointLight(0xffffff, 0.2, 30); // White - smaller
        tailLight.position.set(0, 0.5, -3); // Closer to aircraft
        this.aircraft.add(tailLight);
        
        console.log('Aircraft navigation lights created');
    }

    update(deltaTime, input) {
        if (!this.aircraft) return;
        
        // NEW: Prevent all updates if aircraft has crashed
        if (this.crashed) {
            // Only allow reset functionality when crashed
            return;
        }
        
        this.updateControls(input);
        this.updatePhysics(deltaTime);
        this.updateAircraftMetrics();
        this.checkTerrainCollision();
    }

    updateControls(input) {
        // NEW: Ignore all control inputs except reset when crashed
        if (this.crashed) {
            return; // No control when crashed
        }
        
        // Update control inputs (will be connected to input system)
        if (input) {
            this.controls.throttle = input.throttle || 0;
            this.controls.pitch = input.pitch || 0;
            this.controls.yaw = input.yaw || 0;
            this.controls.roll = input.roll || 0;
            
            // Debug: Log when we receive significant control input
            if (input.throttle > 0 || Math.abs(input.pitch) > 0 || Math.abs(input.yaw) > 0 || Math.abs(input.roll) > 0) {
                console.log('Aircraft received input:', input);
            }
        }
        
        // Calculate thrust from throttle
        this.thrust = this.controls.throttle * this.maxThrust;
        
        // Realistic banking dynamics
        this.updateBankingDynamics();
        
        // Debug: Log thrust calculation
        if (this.thrust > 0) {
            console.log('Current thrust:', this.thrust, 'Bank angle:', (this.bankAngle * 180 / Math.PI).toFixed(1), '°');
        }
    }
    
    updateBankingDynamics() {
        const speed = this.velocity.length();
        
        // Roll input creates banking
        const rollInput = this.controls.roll;
        const targetBankAngle = rollInput * this.maxBankAngle;
        
        // Smooth banking transition
        const bankingRate = 0.08;
        this.bankAngle += (targetBankAngle - this.bankAngle) * bankingRate;
        this.bankAngle = Math.max(-this.maxBankAngle, Math.min(this.maxBankAngle, this.bankAngle));
        
        // NEW: Only apply banking forces when there's sufficient forward speed
        const minimumSpeedForTurn = 30; // Prevent banking effects at low speeds
        
        if (Math.abs(this.bankAngle) > 0.1 && speed > minimumSpeedForTurn) {
            // Turn rate proportional to bank and speed
            this.turnRate = -Math.sin(this.bankAngle) * speed * 0.0008;
            this.gForce = 1.0 / Math.cos(this.bankAngle);
            this.angularVelocity.y = this.turnRate;
        } else {
            this.turnRate = 0;
            this.gForce = 1.0;
            // NEW: Add banking stability - return to level when no input
            if (Math.abs(rollInput) < 0.1) {
                this.bankAngle *= 0.95; // Gradual return to level flight
            }
        }
        
        // Separate pitch control (independent of banking)
        this.angularVelocity.x = this.controls.pitch * this.pitchSensitivity;
        
        // NEW: Improved adverse yaw calculation
        const adverseYaw = rollInput * 0.2 * (speed / 100); // Scale with airspeed
        const rudderInput = this.controls.yaw;
        const netYaw = (rudderInput * this.yawSensitivity) + adverseYaw;
        
        // Only apply yaw if we have turning capability
        if (speed > minimumSpeedForTurn) {
            this.angularVelocity.y += netYaw;
        }
        
        // Debug pitch input (remove after testing)
        if (Math.abs(this.controls.pitch) > 0.1) {
            console.log('Pitch input:', this.controls.pitch, 'Angular velocity X:', this.angularVelocity.x);
        }
    }

    updatePhysics(deltaTime) {
        if (!this.aircraft) return;
        
        // NEW: Skip all physics when crashed - aircraft should remain stationary
        if (this.crashed) {
            return; // No physics updates when crashed
        }
        
        const speed = this.velocity.length();
        
        // Get aircraft's forward direction 
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.aircraft.quaternion);
        
        // Get aircraft's up direction for lift calculation
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(this.aircraft.quaternion);
        
        // Apply thrust in forward direction
        const thrustForce = forward.clone().multiplyScalar(this.thrust / this.mass);
        this.acceleration.copy(thrustForce);
        
        // Realistic lift calculation based on airspeed and angle of attack
        if (speed > 0) {
            // Lift is perpendicular to forward motion and proportional to speed²
            const liftMagnitude = speed * speed * this.liftCoefficient * 0.0001;
            
            // Banking reduces effective lift (realistic aerodynamics)
            const bankingLossFactor = Math.cos(this.bankAngle);
            const effectiveLift = liftMagnitude * bankingLossFactor;
            
            // Apply lift in aircraft's up direction
            const liftForce = up.clone().multiplyScalar(effectiveLift);
            this.acceleration.add(liftForce);
            
            // Banking creates horizontal turning force
            if (Math.abs(this.bankAngle) > 0.1) {
                const bankingForce = forward.clone()
                    .cross(up)
                    .multiplyScalar(liftMagnitude * Math.sin(this.bankAngle) * 0.5);
                this.acceleration.add(bankingForce);
            }
        }
        
        // Apply gravity (affected by G-force in turns)
        this.acceleration.y += this.gravity * this.gForce;
        
        // Drag increases with speed² and banking
        const dragMagnitude = speed * speed * this.dragCoefficient * (1 + Math.abs(this.bankAngle) * 0.5);
        if (speed > 0) {
            const dragForce = forward.clone().multiplyScalar(-dragMagnitude / this.mass);
            this.acceleration.add(dragForce);
        }
        
        // Stall mechanics - loss of control at low speeds
        if (speed < this.stallSpeed && speed > 5) {
            // Aircraft becomes unstable and tends to nose down
            this.angularVelocity.x += (this.stallSpeed - speed) * 0.001; // Nose down tendency
            this.angularVelocity.z += (Math.random() - 0.5) * 0.02; // Random roll
            
            // Reduce lift effectiveness
            this.acceleration.y -= (this.stallSpeed - speed) * 0.02;
        }
        
        // Add base upward force when throttle is applied (arcade physics component)
        if (this.thrust > 0 && speed > this.stallSpeed * 0.5) {
            this.acceleration.y += (this.thrust / this.mass) * 0.3; // Reduced from 0.5
        }
        
        // Update velocity
        this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
        
        // Apply drag to velocity
        this.velocity.multiplyScalar(0.995); // More realistic drag
        
        // Update position
        this.aircraft.position.add(this.velocity.clone().multiplyScalar(deltaTime * 15)); // Slightly reduced from 20
        
        // FIXED: Use quaternion-based rotation to avoid gimbal lock and axis drift
        const rotationQuaternion = new THREE.Quaternion();
        
        // Create rotation from current angular velocities
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.angularVelocity.x * deltaTime);
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.angularVelocity.y * deltaTime);
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.bankAngle);
        
        // Compose rotations in proper order: Roll -> Pitch -> Yaw
        rotationQuaternion.multiplyQuaternions(yawQuat, pitchQuat);
        rotationQuaternion.multiply(rollQuat);
        
        // Apply to aircraft
        this.aircraft.quaternion.copy(rotationQuaternion);
        
        // REMOVED: Old Euler rotation code that caused axis drift
        // this.aircraft.rotation.x += this.angularVelocity.x * deltaTime;
        // this.aircraft.rotation.y += this.angularVelocity.y * deltaTime;
        // this.aircraft.rotation.z = this.bankAngle; // Direct banking control for realistic look
        
        // Dampen angular velocity more realistically
        this.angularVelocity.multiplyScalar(0.92); // More damping for realism
    }

    updateAircraftMetrics() {
        if (!this.aircraft) return;
        
        // Calculate current metrics
        this.speed = this.velocity.length() * 3.6; // Convert to km/h
        this.altitude = this.aircraft.position.y;
        
        // Update engine state
        this.isEngineOn = this.thrust > 0;
    }

    checkTerrainCollision() {
        if (!this.aircraft || !this.environment) return;
        
        const position = this.aircraft.position;
        
        // NEW: Check multiple points on aircraft (wings, nose, tail)
        const checkPoints = [
            // Center
            { offset: new THREE.Vector3(0, 0, 0), part: 'fuselage' },
            // Left wing tip
            { offset: new THREE.Vector3(-8, -1, 0), part: 'leftWing' },
            // Right wing tip  
            { offset: new THREE.Vector3(8, -1, 0), part: 'rightWing' },
            // Nose
            { offset: new THREE.Vector3(0, -0.5, 4), part: 'nose' },
            // Tail
            { offset: new THREE.Vector3(0, 1, -4), part: 'tail' }
        ];
        
        for (const point of checkPoints) {
            // Transform offset by aircraft rotation using quaternion (consistent with physics)
            const worldOffset = point.offset.clone();
            worldOffset.applyQuaternion(this.aircraft.quaternion);
            
            const checkPosition = position.clone().add(worldOffset);
            const terrainHeight = this.environment.getTerrainHeightAt(checkPosition.x, checkPosition.z);
            
            const safetyMargin = 1; // Reduced margin for accuracy
            if (checkPosition.y <= terrainHeight + safetyMargin) {
                this.handleCrash(point.part, checkPosition); // Pass collision part and position
                break;
            }
        }
    }

    handleCrash(collisionPart = 'fuselage', crashPosition = null) {
        // Prevent multiple crash triggers
        if (this.crashed) {
            return; // Already crashed, don't process again
        }
        
        console.log(`AIRCRAFT CRASH DETECTED! Collision part: ${collisionPart}`);
        
        // Mark aircraft as crashed to prevent all movement
        this.crashed = true;
        
        // Completely stop all motion and forces
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.thrust = 0;
        this.bankAngle = 0;
        this.turnRate = 0;
        this.gForce = 1.0;
        
        // Get current aircraft orientation for realistic crash positioning
        const currentRotation = this.aircraft.rotation.clone();
        const crashVelocity = this.velocity.length();
        
        // Position aircraft on ground with realistic terrain contact
        const terrainHeight = this.environment.getTerrainHeightAt(
            this.aircraft.position.x, 
            this.aircraft.position.z
        );
        
        // NEW: Spatially aware crash mechanics based on collision part and impact velocity
        const crashQuaternion = new THREE.Quaternion();
        const impactIntensity = Math.min(crashVelocity / 50, 1.0); // Normalize impact intensity
        
        switch(collisionPart) {
            case 'leftWing':
                // Left wing strike causes aircraft to cartwheel left and nose down
                this.aircraft.position.y = terrainHeight + 3; // Lower to ground
                const leftWingPitch = Math.PI * (0.15 + impactIntensity * 0.25); // 15-40 degrees nose down
                const leftWingRoll = -Math.PI * (0.4 + impactIntensity * 0.3); // 40-70 degrees left roll
                crashQuaternion.setFromEuler(new THREE.Euler(leftWingPitch, currentRotation.y, leftWingRoll));
                console.log(`Left wing impact: ${(leftWingPitch * 180/Math.PI).toFixed(1)}° pitch, ${(leftWingRoll * 180/Math.PI).toFixed(1)}° roll`);
                break;
                
            case 'rightWing':
                // Right wing strike causes aircraft to cartwheel right and nose down
                this.aircraft.position.y = terrainHeight + 3; // Lower to ground
                const rightWingPitch = Math.PI * (0.15 + impactIntensity * 0.25); // 15-40 degrees nose down
                const rightWingRoll = Math.PI * (0.4 + impactIntensity * 0.3); // 40-70 degrees right roll
                crashQuaternion.setFromEuler(new THREE.Euler(rightWingPitch, currentRotation.y, rightWingRoll));
                console.log(`Right wing impact: ${(rightWingPitch * 180/Math.PI).toFixed(1)}° pitch, ${(rightWingRoll * 180/Math.PI).toFixed(1)}° roll`);
                break;
                
            case 'nose':
                // Nose impact causes dramatic nose-down crash, aircraft may flip
                this.aircraft.position.y = terrainHeight + 2; // Very low to ground
                const nosePitch = Math.PI * (0.5 + impactIntensity * 0.4); // 50-90 degrees nose down
                const noseRoll = (Math.random() - 0.5) * Math.PI * 0.3; // Random roll up to 15 degrees
                crashQuaternion.setFromEuler(new THREE.Euler(nosePitch, currentRotation.y, noseRoll));
                console.log(`Nose impact: ${(nosePitch * 180/Math.PI).toFixed(1)}° pitch down, severe crash`);
                break;
                
            case 'tail':
                // Tail strike causes nose-up attitude, aircraft may flip backwards
                this.aircraft.position.y = terrainHeight + 4; // Tail touches, nose up
                const tailPitch = -Math.PI * (0.3 + impactIntensity * 0.3); // 30-60 degrees nose up
                const tailRoll = (Math.random() - 0.5) * Math.PI * 0.2; // Slight random roll
                crashQuaternion.setFromEuler(new THREE.Euler(tailPitch, currentRotation.y, tailRoll));
                console.log(`Tail strike: ${Math.abs(tailPitch * 180/Math.PI).toFixed(1)}° nose up`);
                break;
                
            default:
                // General fuselage impact - sliding crash with mixed orientation
                this.aircraft.position.y = terrainHeight + 3;
                const generalPitch = Math.PI * (0.2 + impactIntensity * 0.2); // 20-40 degrees
                const generalRoll = (Math.random() - 0.5) * Math.PI * 0.4; // Random roll up to 20 degrees
                crashQuaternion.setFromEuler(new THREE.Euler(generalPitch, currentRotation.y, generalRoll));
                console.log(`Fuselage impact: ${(generalPitch * 180/Math.PI).toFixed(1)}° pitch, general crash`);
        }
        
        // Apply the calculated crash orientation
        this.aircraft.quaternion.copy(crashQuaternion);
        
        // Additional realistic positioning based on terrain slope
        this.adjustCrashPositionForTerrain();
        
        console.log(`Aircraft settled at: x=${this.aircraft.position.x.toFixed(1)}, y=${this.aircraft.position.y.toFixed(1)}, z=${this.aircraft.position.z.toFixed(1)}`);
        
        this.onCrash(collisionPart, crashPosition || this.aircraft.position.clone());
    }

    // NEW: Adjust crash position based on terrain slope for more realistic settling
    adjustCrashPositionForTerrain() {
        const currentPos = this.aircraft.position;
        
        // Sample terrain heights around the crash site
        const sampleDistance = 2;
        const frontHeight = this.environment.getTerrainHeightAt(currentPos.x, currentPos.z - sampleDistance);
        const backHeight = this.environment.getTerrainHeightAt(currentPos.x, currentPos.z + sampleDistance);
        const leftHeight = this.environment.getTerrainHeightAt(currentPos.x - sampleDistance, currentPos.z);
        const rightHeight = this.environment.getTerrainHeightAt(currentPos.x + sampleDistance, currentPos.z);
        
        // Calculate terrain slope and adjust aircraft orientation accordingly
        const pitchSlope = (frontHeight - backHeight) / (sampleDistance * 2);
        const rollSlope = (rightHeight - leftHeight) / (sampleDistance * 2);
        
        // Apply subtle terrain-following orientation
        const currentEuler = new THREE.Euler().setFromQuaternion(this.aircraft.quaternion);
        currentEuler.x += pitchSlope * 0.3; // Subtle pitch adjustment for terrain
        currentEuler.z += rollSlope * 0.3;  // Subtle roll adjustment for terrain
        
        this.aircraft.quaternion.setFromEuler(currentEuler);
        
        console.log(`Terrain adjustment: pitch slope ${(pitchSlope * 180/Math.PI).toFixed(1)}°, roll slope ${(rollSlope * 180/Math.PI).toFixed(1)}°`);
    }

    onCrash(collisionPart = 'fuselage', crashPosition = null) {
        // Trigger crash camera if available
        if (window.cameraSystem) {
            console.log(`Triggering crash camera for ${collisionPart} collision`);
            window.cameraSystem.triggerCrashCamera(this.aircraft, collisionPart);
        } else {
            console.log('Camera system not available for crash cinematics');
        }
        
        // Trigger crash effects if available
        if (window.crashEffects) {
            const effectPosition = crashPosition || this.aircraft.position.clone();
            const crashSeverity = Math.max(30, this.velocity.length() * 5);
            
            console.log(`Triggering ${collisionPart} crash effects at:`, effectPosition);
            
            // Check if part-specific crash method exists, otherwise use standard method
            if (typeof window.crashEffects.triggerPartSpecificCrash === 'function') {
                window.crashEffects.triggerPartSpecificCrash(effectPosition, crashSeverity, collisionPart);
            } else {
                window.crashEffects.triggerAircraftCrash(effectPosition, crashSeverity);
            }
        } else {
            console.log('Crash effects system not available');
        }
        
        // Additional crash logic can be added here
        console.log(`Aircraft ${collisionPart} has crashed! Game over logic triggered.`);
    }

    // Check if aircraft can be controlled
    canBeControlled() {
        return !this.crashed;
    }

    // Get aircraft metrics for UI display
    getMetrics() {
        return {
            speed: Math.round(this.speed),
            altitude: Math.round(this.altitude),
            throttle: Math.round(this.controls.throttle * 100),
            engineOn: this.isEngineOn,
            bankAngle: Math.round(this.bankAngle * 180 / Math.PI), // Bank angle in degrees
            gForce: Math.round(this.gForce * 10) / 10, // G-force with 1 decimal
            turnRate: Math.round(this.turnRate * 1000) / 10, // Turn rate in degrees/sec
            stallWarning: this.velocity.length() < this.stallSpeed && !this.crashed,
            crashed: this.crashed, // NEW: Include crash state
            position: {
                x: Math.round(this.aircraft?.position.x || 0),
                y: Math.round(this.aircraft?.position.y || 0),
                z: Math.round(this.aircraft?.position.z || 0)
            }
        };
    }

    // Reset aircraft to spawn position
    reset() {
        if (!this.aircraft) return;
        
        // NEW: Reset crash state to allow movement again
        this.crashed = false;
        
        this.positionAircraft();
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.thrust = 0;
        
        // Reset flight dynamics
        this.bankAngle = 0;
        this.turnRate = 0;
        this.gForce = 1.0;
        
        // Reset controls
        this.controls = {
            throttle: 0,
            pitch: 0,
            yaw: 0,
            roll: 0
        };
        
        console.log('Aircraft reset to spawn position - crash state cleared');
    }
}
