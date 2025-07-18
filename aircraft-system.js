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
        this.maxThrust = 2000;
        this.drag = 0.98;
        this.lift = 0;
        this.gravity = -9.8;
        this.mass = 1000;
        
        // Control parameters
        this.pitchSensitivity = 0.02;
        this.yawSensitivity = 0.02;
        this.rollSensitivity = 0.03;
        
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
                    
                    // Check and potentially fix the model's orientation
                    // Some GLB models might be rotated differently than expected
                    console.log('Original model rotation:', this.aircraftModel.rotation);
                    
                    // If the model appears sideways, we might need to rotate it
                    // Uncomment one of these if the aircraft appears rotated:
                    // this.aircraftModel.rotation.y = Math.PI; // 180 degree turn
                    // this.aircraftModel.rotation.y = Math.PI/2; // 90 degree turn
                    // this.aircraftModel.rotation.y = -Math.PI/2; // -90 degree turn
                    
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
        }
        
        // Calculate thrust from throttle
        this.thrust = this.controls.throttle * this.maxThrust;
        
        // Calculate angular velocities from control inputs
        this.angularVelocity.x = this.controls.pitch * this.pitchSensitivity;
        this.angularVelocity.y = this.controls.yaw * this.yawSensitivity;
        this.angularVelocity.z = this.controls.roll * this.rollSensitivity;
    }

    updatePhysics(deltaTime) {
        if (!this.aircraft) return;
        
        // Get aircraft's forward direction (negative Z in local space for typical aircraft models)
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.aircraft.quaternion);
        
        // Apply thrust in forward direction
        const thrustForce = forward.multiplyScalar(this.thrust / this.mass);
        this.acceleration.copy(thrustForce);
        
        // Apply gravity
        this.acceleration.y += this.gravity;
        
        // Calculate lift based on speed and angle of attack
        const speed = this.velocity.length();
        const liftForce = speed * speed * 0.0001; // Simple lift calculation
        this.acceleration.y += liftForce;
        
        // Update velocity
        this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
        
        // Apply drag
        this.velocity.multiplyScalar(this.drag);
        
        // Update position
        this.aircraft.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Update rotation
        this.aircraft.rotation.x += this.angularVelocity.x * deltaTime;
        this.aircraft.rotation.y += this.angularVelocity.y * deltaTime;
        this.aircraft.rotation.z += this.angularVelocity.z * deltaTime;
        
        // Dampen angular velocity
        this.angularVelocity.multiplyScalar(0.95);
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
