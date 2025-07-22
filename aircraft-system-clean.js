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
        this.maxThrust = 10000;
        this.drag = 0.985;
        this.lift = 0;
        this.gravity = -1.5;
        this.mass = 1000;
        
        // Control parameters
        this.pitchSensitivity = 0.4;
        this.yawSensitivity = 0.02;
        this.rollSensitivity = 0.05;
        
        // Advanced flight dynamics
        this.bankAngle = 0;
        this.turnRate = 0;
        this.gForce = 1.0;
        this.stallSpeed = 50;
        this.maxBankAngle = Math.PI * 0.7;
        
        // Aerodynamic coefficients
        this.liftCoefficient = 0.8;
        this.dragCoefficient = 0.03;
        this.stallAngle = Math.PI / 6;
        
        // Aircraft state
        this.isEngineOn = false;
        this.speed = 0;
        this.altitude = 0;
        this.crashed = false; // Start in non-crashed state
        
        // Controls state
        this.controls = {
            throttle: 0,
            pitch: 0,
            yaw: 0,
            roll: 0
        };
        
        console.log('Aircraft system initialized - not crashed');
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
                    this.aircraftModel.scale.setScalar(1);
                    this.aircraftModel.rotation.y = Math.PI/2;
                    
                    this.aircraft = new THREE.Group();
                    this.aircraft.add(this.aircraftModel);
                    
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
        
        const spawnPosition = this.environment.getCornerSpawnPosition();
        this.aircraft.position.copy(spawnPosition);
        
        this.aircraft.rotation.y = Math.PI * 0.25;
        this.aircraft.rotation.x = 0;
        this.aircraft.rotation.z = 0;
        
        console.log(`Aircraft positioned at: x=${spawnPosition.x.toFixed(2)}, y=${spawnPosition.y.toFixed(2)}, z=${spawnPosition.z.toFixed(2)}`);
    }

    createAircraftLights() {
        if (!this.aircraft) return;
        
        const leftWingLight = new THREE.PointLight(0xff0000, 0.3, 50);
        leftWingLight.position.set(-2, 0, 0);
        this.aircraft.add(leftWingLight);
        
        const rightWingLight = new THREE.PointLight(0x00ff00, 0.3, 50);
        rightWingLight.position.set(2, 0, 0);
        this.aircraft.add(rightWingLight);
        
        const tailLight = new THREE.PointLight(0xffffff, 0.2, 30);
        tailLight.position.set(0, 0.5, -3);
        this.aircraft.add(tailLight);
        
        console.log('Aircraft navigation lights created');
    }

    update(deltaTime, input) {
        if (!this.aircraft) return;
        
        // Debug crash state
        if (this.crashed) {
            console.log('CRASHED STATE: Aircraft cannot move. Press R to reset.');
            if (input && input.reset) {
                console.log('Reset key pressed - resetting aircraft');
                this.reset();
                return;
            }
            return; // Exit early if crashed
        }
        
        this.updateControls(input);
        this.updatePhysics(deltaTime);
        this.updateAircraftMetrics();
        this.checkTerrainCollision();
    }

    updateControls(input) {
        if (this.crashed) return;
        
        if (input) {
            this.controls.throttle = input.throttle || 0;
            this.controls.pitch = input.pitch || 0;
            this.controls.yaw = input.yaw || 0;
            this.controls.roll = input.roll || 0;
            
            if (input.throttle > 0 || Math.abs(input.pitch) > 0 || Math.abs(input.yaw) > 0 || Math.abs(input.roll) > 0) {
                console.log('Aircraft received input:', input);
            }
        }
        
        this.thrust = this.controls.throttle * this.maxThrust;
        this.updateBankingDynamics();
        
        if (this.thrust > 0) {
            console.log('Current thrust:', this.thrust);
        }
    }
    
    updateBankingDynamics() {
        const speed = this.velocity.length();
        const rollInput = this.controls.roll;
        const targetBankAngle = rollInput * this.maxBankAngle;
        
        const bankingRate = 0.08;
        this.bankAngle += (targetBankAngle - this.bankAngle) * bankingRate;
        this.bankAngle = Math.max(-this.maxBankAngle, Math.min(this.maxBankAngle, this.bankAngle));
        
        if (Math.abs(this.bankAngle) > 0.1 && speed > this.stallSpeed) {
            this.turnRate = -Math.sin(this.bankAngle) * speed * 0.0008;
            this.gForce = 1.0 / Math.cos(this.bankAngle);
            this.angularVelocity.y = this.turnRate;
        } else {
            this.turnRate = 0;
            this.gForce = 1.0;
        }
        
        const adverseYaw = rollInput * 0.3;
        const rudderInput = this.controls.yaw;
        const netYaw = (rudderInput * this.yawSensitivity) + adverseYaw;
        
        this.angularVelocity.x = this.controls.pitch;
        this.angularVelocity.y += netYaw;
        this.angularVelocity.z = this.bankAngle * 0.5;
    }

    updatePhysics(deltaTime) {
        if (!this.aircraft || this.crashed) return;
        
        const speed = this.velocity.length();
        
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.aircraft.quaternion);
        
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(this.aircraft.quaternion);
        
        const thrustForce = forward.clone().multiplyScalar(this.thrust / this.mass);
        this.acceleration.copy(thrustForce);
        
        if (speed > 0) {
            const liftMagnitude = speed * speed * this.liftCoefficient * 0.0001;
            const bankingLossFactor = Math.cos(this.bankAngle);
            const effectiveLift = liftMagnitude * bankingLossFactor;
            
            const liftForce = up.clone().multiplyScalar(effectiveLift);
            this.acceleration.add(liftForce);
            
            if (Math.abs(this.bankAngle) > 0.1 && speed > 30) {
                this.turnRate = -Math.sin(this.bankAngle) * speed * 0.0008;
                this.gForce = 1.0 / Math.cos(this.bankAngle);
                this.angularVelocity.y = this.turnRate;
            } else {
                this.turnRate = 0;
                this.gForce = 1.0;
                if (Math.abs(this.controls.roll) < 0.1) {
                    this.bankAngle *= 0.95;
                }
            }
        }
        
        this.acceleration.y += this.gravity * this.gForce;
        
        const dragMagnitude = speed * speed * this.dragCoefficient * (1 + Math.abs(this.bankAngle) * 0.5);
        if (speed > 0) {
            const dragForce = forward.clone().multiplyScalar(-dragMagnitude / this.mass);
            this.acceleration.add(dragForce);
        }
        
        if (speed < this.stallSpeed && speed > 5) {
            this.angularVelocity.x += (this.stallSpeed - speed) * 0.001;
            this.angularVelocity.z += (Math.random() - 0.5) * 0.02;
            this.acceleration.y -= (this.stallSpeed - speed) * 0.02;
        }
        
        if (this.thrust > 0 && speed > this.stallSpeed * 0.5) {
            this.acceleration.y += (this.thrust / this.mass) * 0.3;
        }
        
        this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
        this.velocity.multiplyScalar(0.995);
        
        this.aircraft.position.add(this.velocity.clone().multiplyScalar(deltaTime * 15));
        
        const rotationQuaternion = new THREE.Quaternion();
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.angularVelocity.x * deltaTime);
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.angularVelocity.y * deltaTime);
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.bankAngle);
        
        rotationQuaternion.multiplyQuaternions(yawQuat, pitchQuat);
        rotationQuaternion.multiply(rollQuat);
        
        this.aircraft.quaternion.copy(rotationQuaternion);
        this.angularVelocity.multiplyScalar(0.96);
    }

    updateAircraftMetrics() {
        if (!this.aircraft) return;
        
        this.speed = this.velocity.length() * 3.6;
        this.altitude = this.aircraft.position.y;
        this.isEngineOn = this.thrust > 0;
    }

    checkTerrainCollision() {
        if (!this.aircraft || !this.environment || this.crashed) return;
        
        const position = this.aircraft.position;
        const terrainHeight = this.environment.getTerrainHeightAt(position.x, position.z);
        
        const safetyMargin = 5; // Reasonable margin
        if (position.y <= terrainHeight + safetyMargin) {
            this.handleCrash();
        }
    }

    handleCrash() {
        if (this.crashed) return; // Prevent multiple crashes
        
        console.log('AIRCRAFT CRASH DETECTED! Press R to reset.');
        this.crashed = true;
        
        // Stop all motion
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.thrust = 0;
        this.bankAngle = 0;
        this.turnRate = 0;
        this.gForce = 1.0;
        
        // Position on ground
        const terrainHeight = this.environment.getTerrainHeightAt(
            this.aircraft.position.x, 
            this.aircraft.position.z
        );
        this.aircraft.position.y = terrainHeight + 5;
        
        // Add crash rotation
        this.aircraft.rotation.x = Math.PI * 0.3;
        this.aircraft.rotation.z = Math.PI * 0.2;
        
        console.log('Aircraft crashed - all systems stopped');
    }

    reset() {
        console.log('Resetting aircraft...');
        this.crashed = false; // Clear crash state first
        
        this.positionAircraft();
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.thrust = 0;
        
        this.bankAngle = 0;
        this.turnRate = 0;
        this.gForce = 1.0;
        
        this.controls = {
            throttle: 0,
            pitch: 0,
            yaw: 0,
            roll: 0
        };
        
        console.log('Aircraft reset complete - ready to fly');
    }

    getMetrics() {
        return {
            speed: Math.round(this.speed),
            altitude: Math.round(this.altitude),
            throttle: Math.round(this.controls.throttle * 100),
            engineOn: this.isEngineOn,
            bankAngle: Math.round(this.bankAngle * 180 / Math.PI),
            gForce: Math.round(this.gForce * 10) / 10,
            turnRate: Math.round(this.turnRate * 1000) / 10,
            stallWarning: this.velocity.length() < this.stallSpeed,
            crashed: this.crashed,
            position: {
                x: Math.round(this.aircraft?.position.x || 0),
                y: Math.round(this.aircraft?.position.y || 0),
                z: Math.round(this.aircraft?.position.z || 0)
            }
        };
    }
}
