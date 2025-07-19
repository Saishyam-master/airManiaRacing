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
        
        this.updateControls(input);
        this.updatePhysics(deltaTime);
        this.updateAircraftMetrics();
        this.checkTerrainCollision();
    }

    updateControls(input) {
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
        
        // Smooth banking transition (realistic aircraft don't snap to bank angles)
        const bankingRate = 0.08; // How quickly aircraft can change bank angle
        this.bankAngle += (targetBankAngle - this.bankAngle) * bankingRate;
        
        // Limit maximum bank angle
        this.bankAngle = Math.max(-this.maxBankAngle, Math.min(this.maxBankAngle, this.bankAngle));
        
        // Banking creates turning force (this is how real aircraft turn!)
        if (Math.abs(this.bankAngle) > 0.1 && speed > this.stallSpeed) {
            // Turn rate is proportional to bank angle and speed
            // FIXED: Negative sign to correct travel direction
            this.turnRate = -Math.sin(this.bankAngle) * speed * 0.0008;
            
            // G-force increases with bank angle
            this.gForce = 1.0 / Math.cos(this.bankAngle);
            
            // Apply turning moment
            this.angularVelocity.y = this.turnRate;
        } else {
            this.turnRate = 0;
            this.gForce = 1.0;
        }
        
        // Adverse yaw effect - aircraft naturally yaws opposite to roll direction
        const adverseYaw = rollInput * 0.3; // FIXED: Removed negative sign
        
        // Coordinated turn requires rudder input to counteract adverse yaw
        const rudderInput = this.controls.yaw;
        const netYaw = (rudderInput * this.yawSensitivity) + adverseYaw;
        
        // Apply pitch and corrected yaw
        this.angularVelocity.x = this.controls.pitch * this.pitchSensitivity;
        this.angularVelocity.y += netYaw; // Add to existing turn rate
        this.angularVelocity.z = this.bankAngle * 0.5; // Bank angle affects roll rate
        
        // Debug pitch input (remove after testing)
        if (Math.abs(this.controls.pitch) > 0.1) {
            console.log('Pitch input:', this.controls.pitch, 'Angular velocity X:', this.angularVelocity.x);
        }
    }

    updatePhysics(deltaTime) {
        if (!this.aircraft) return;
        
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
        
        // Update rotation with banking
        this.aircraft.rotation.x += this.angularVelocity.x * deltaTime;
        this.aircraft.rotation.y += this.angularVelocity.y * deltaTime;
        this.aircraft.rotation.z = this.bankAngle; // Direct banking control for realistic look
        
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
        const terrainHeight = this.environment.getTerrainHeightAt(position.x, position.z);
        
        // Much smaller safety margin for tiny aircraft
        const safetyMargin = 3; // Reduced from 8 to 3 for very small aircraft
        if (position.y <= terrainHeight + safetyMargin) {
            this.handleCrash();
        }
    }

    handleCrash() {
        console.log('AIRCRAFT CRASH DETECTED!');
        
        // Stop the aircraft
        this.velocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.thrust = 0;
        
        // Position aircraft on ground
        const terrainHeight = this.environment.getTerrainHeightAt(
            this.aircraft.position.x, 
            this.aircraft.position.z
        );
        this.aircraft.position.y = terrainHeight + 5;
        
        // Add some dramatic rotation
        this.aircraft.rotation.x = Math.PI * 0.3;
        this.aircraft.rotation.z = Math.PI * 0.2;
        
        // Emit crash event (for game state management)
        this.onCrash();
    }

    onCrash() {
        // Override this method to handle crash events
        console.log('Aircraft has crashed! Implement game over logic here.');
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
            stallWarning: this.velocity.length() < this.stallSpeed,
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
        
        this.positionAircraft();
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.thrust = 0;
        
        // Reset controls
        this.controls = {
            throttle: 0,
            pitch: 0,
            yaw: 0,
            roll: 0
        };
        
        console.log('Aircraft reset to spawn position');
    }
}
