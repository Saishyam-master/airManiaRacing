import * as THREE from 'three';

export class RaceTrack {
    constructor(scene, environment) {
        this.scene = scene;
        this.environment = environment;
        
        // Racing gate system
        this.gates = [];
        this.currentGate = 0;
        this.totalGates = 8;
        this.gateRadius = 50;
        this.gateHeight = 30;
        
        // Race timing
        this.raceStarted = false;
        this.raceStartTime = 0;
        this.currentLapTime = 0;
        this.bestLapTime = null;
        this.lapCount = 0;
        
        // Gate materials
        this.activeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        this.inactiveMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0066cc, 
            transparent: true, 
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        this.completedMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        console.log('RaceTrack system initialized');
    }

    async init() {
        try {
            this.createRaceGates();
            this.createStartFinishLine();
            console.log('RaceTrack ready - 8 gates created');
        } catch (error) {
            console.error('Error initializing racetrack:', error);
        }
    }

    createRaceGates() {
        // Create a circular course around the terrain
        const centerX = 0;
        const centerZ = 0;
        const courseRadius = 2000; // Large course radius
        
        for (let i = 0; i < this.totalGates; i++) {
            const angle = (i / this.totalGates) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * courseRadius;
            const z = centerZ + Math.sin(angle) * courseRadius;
            
            // Get terrain height at gate position
            const terrainHeight = this.environment.getTerrainHeightAt(x, z);
            const gateY = terrainHeight + 80; // Gates 80 units above terrain
            
            const gate = this.createGate(x, gateY, z, i);
            this.gates.push(gate);
            this.scene.add(gate);
        }
        
        // Set first gate as active
        this.updateGateStates();
    }

    createGate(x, y, z, index) {
        const gate = new THREE.Group();
        gate.position.set(x, y, z);
        
        // Create gate ring (torus geometry)
        const gateGeometry = new THREE.TorusGeometry(this.gateRadius, 3, 8, 16);
        const gateMesh = new THREE.Mesh(gateGeometry, this.inactiveMaterial);
        gate.add(gateMesh);
        
        // Create gate number display
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.font = '48px Arial';
        context.textAlign = 'center';
        context.fillText((index + 1).toString(), 64, 45);
        
        const numberTexture = new THREE.CanvasTexture(canvas);
        const numberMaterial = new THREE.MeshBasicMaterial({ 
            map: numberTexture, 
            transparent: true 
        });
        const numberGeometry = new THREE.PlaneGeometry(20, 10);
        const numberMesh = new THREE.Mesh(numberGeometry, numberMaterial);
        numberMesh.position.y = this.gateRadius + 20;
        gate.add(numberMesh);
        
        // Store gate data
        gate.userData = {
            index: index,
            gateMesh: gateMesh,
            numberMesh: numberMesh,
            passed: false
        };
        
        return gate;
    }

    createStartFinishLine() {
        // Start/finish line at gate 0
        const startGate = this.gates[0];
        if (startGate) {
            // Add start/finish banner
            const bannerGeometry = new THREE.PlaneGeometry(100, 20);
            const bannerMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000, 
                transparent: true, 
                opacity: 0.7 
            });
            const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
            banner.position.y = this.gateRadius + 40;
            startGate.add(banner);
            
            // Add "START/FINISH" text
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.font = '24px Arial';
            context.textAlign = 'center';
            context.fillText('START/FINISH', 128, 40);
            
            const textTexture = new THREE.CanvasTexture(canvas);
            const textMaterial = new THREE.MeshBasicMaterial({ 
                map: textTexture, 
                transparent: true 
            });
            const textGeometry = new THREE.PlaneGeometry(50, 12);
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.y = this.gateRadius + 40;
            textMesh.position.z = 1;
            startGate.add(textMesh);
        }
    }

    update(deltaTime, aircraftPosition) {
        if (!aircraftPosition) return;
        
        // Check for gate collisions
        this.checkGateCollisions(aircraftPosition);
        
        // Update race timing
        if (this.raceStarted) {
            this.currentLapTime = (Date.now() - this.raceStartTime) / 1000;
        }
        
        // Animate gates (gentle pulsing effect)
        this.gates.forEach((gate, index) => {
            if (gate.userData.gateMesh) {
                const time = Date.now() * 0.001;
                const pulse = Math.sin(time + index) * 0.1 + 1.0;
                gate.userData.gateMesh.material.opacity = gate.userData.gateMesh.material.opacity * pulse;
            }
        });
    }

    checkGateCollisions(aircraftPosition) {
        const currentGateObj = this.gates[this.currentGate];
        if (!currentGateObj) return;
        
        const gatePosition = currentGateObj.position;
        const distance = aircraftPosition.distanceTo(gatePosition);
        
        // Check if aircraft passed through the gate
        if (distance < this.gateRadius) {
            this.passGate(this.currentGate);
        }
    }

    passGate(gateIndex) {
        console.log(`Gate ${gateIndex + 1} passed!`);
        
        // Mark gate as passed
        const gate = this.gates[gateIndex];
        gate.userData.passed = true;
        
        // Start race on first gate
        if (gateIndex === 0 && !this.raceStarted) {
            this.startRace();
        }
        
        // Move to next gate
        this.currentGate = (this.currentGate + 1) % this.totalGates;
        
        // Check for lap completion
        if (this.currentGate === 0 && this.raceStarted) {
            this.completeLap();
        }
        
        // Update gate visual states
        this.updateGateStates();
    }

    startRace() {
        console.log('🏁 Race Started!');
        this.raceStarted = true;
        this.raceStartTime = Date.now();
        this.currentLapTime = 0;
    }

    completeLap() {
        this.lapCount++;
        const lapTime = this.currentLapTime;
        
        console.log(`🏆 Lap ${this.lapCount} completed! Time: ${lapTime.toFixed(2)}s`);
        
        // Update best lap time
        if (!this.bestLapTime || lapTime < this.bestLapTime) {
            this.bestLapTime = lapTime;
            console.log(`🎯 New best lap time: ${this.bestLapTime.toFixed(2)}s`);
        }
        
        // Reset for next lap
        this.raceStartTime = Date.now();
        this.resetGateStates();
    }

    updateGateStates() {
        this.gates.forEach((gate, index) => {
            const gateMesh = gate.userData.gateMesh;
            if (!gateMesh) return;
            
            if (index === this.currentGate) {
                // Current target gate - bright green
                gateMesh.material = this.activeMaterial;
            } else if (gate.userData.passed) {
                // Completed gate - white/transparent
                gateMesh.material = this.completedMaterial;
            } else {
                // Future gate - blue
                gateMesh.material = this.inactiveMaterial;
            }
        });
    }

    resetGateStates() {
        this.gates.forEach(gate => {
            gate.userData.passed = false;
        });
        this.updateGateStates();
    }

    getRaceData() {
        return {
            raceStarted: this.raceStarted,
            currentGate: this.currentGate + 1,
            totalGates: this.totalGates,
            currentLapTime: this.currentLapTime,
            bestLapTime: this.bestLapTime,
            lapCount: this.lapCount,
            gatesCompleted: this.gates.filter(g => g.userData.passed).length
        };
    }

    // Get next gate position for navigation
    getNextGatePosition() {
        const nextGate = this.gates[this.currentGate];
        return nextGate ? nextGate.position.clone() : null;
    }

    // Get distance to next gate
    getDistanceToNextGate(aircraftPosition) {
        const nextGatePos = this.getNextGatePosition();
        return nextGatePos ? aircraftPosition.distanceTo(nextGatePos) : null;
    }
}
