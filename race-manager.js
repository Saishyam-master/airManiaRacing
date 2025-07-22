// Race Manager - Core racing logic and timing
class RaceManager {
    constructor(scene, aircraftSystem) {
        this.scene = scene;
        this.aircraftSystem = aircraftSystem;
        
        // Race state
        this.isRacing = false;
        this.raceStartTime = 0;
        this.currentLap = 0;
        this.totalLaps = 3;
        this.checkpointsHit = 0;
        this.totalCheckpoints = 6; // Will be configurable
        
        // Timing
        this.lapTimes = [];
        this.bestLapTime = null;
        this.currentLapStart = 0;
        
        // Checkpoints
        this.checkpoints = [];
        this.nextCheckpoint = 0;
        
        // Events
        this.callbacks = {
            onCheckpoint: [],
            onLapComplete: [],
            onRaceComplete: [],
            onCrash: []
        };
        
        this.init();
    }
    
    init() {
        this.createCheckpoints();
        this.setupEventListeners();
    }
    
    createCheckpoints() {
        // Simple ring checkpoints for MVP
        const checkpointPositions = [
            { x: 100, y: 20, z: 0 },
            { x: 200, y: 25, z: -100 },
            { x: 100, y: 30, z: -200 },
            { x: -100, y: 25, z: -200 },
            { x: -200, y: 20, z: -100 },
            { x: -100, y: 15, z: 0 }
        ];
        
        checkpointPositions.forEach((pos, index) => {
            const checkpoint = this.createCheckpointRing(pos, index);
            this.checkpoints.push(checkpoint);
            this.scene.add(checkpoint.mesh);
        });
    }
    
    createCheckpointRing(position, index) {
        // Ring geometry for visual checkpoint
        const ringGeometry = new THREE.RingGeometry(8, 12, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: index === this.nextCheckpoint ? 0x00ff00 : 0x0088ff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(position.x, position.y, position.z);
        ring.lookAt(
            position.x + (index % 2 === 0 ? 1 : -1), 
            position.y, 
            position.z
        );
        
        // Collision detection box
        const collisionBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(position.x, position.y, position.z),
            new THREE.Vector3(20, 20, 5)
        );
        
        return {
            mesh: ring,
            position: position,
            collisionBox: collisionBox,
            index: index,
            hit: false
        };
    }
    
    startRace() {
        this.isRacing = true;
        this.raceStartTime = Date.now();
        this.currentLapStart = Date.now();
        this.currentLap = 1;
        this.checkpointsHit = 0;
        this.nextCheckpoint = 0;
        
        // Reset all checkpoints
        this.checkpoints.forEach(checkpoint => {
            checkpoint.hit = false;
            checkpoint.mesh.material.color.setHex(0x0088ff);
        });
        
        // Highlight first checkpoint
        this.checkpoints[0].mesh.material.color.setHex(0x00ff00);
        
        this.emit('raceStart');
    }
    
    update() {
        if (!this.isRacing) return;
        
        // Check checkpoint collisions
        this.checkCheckpointCollisions();
        
        // Check for crashes (terrain collision)
        this.checkCrashConditions();
    }
    
    checkCheckpointCollisions() {
        if (this.nextCheckpoint >= this.checkpoints.length) return;
        
        const aircraft = this.aircraftSystem.aircraft;
        const aircraftPos = aircraft.position;
        const checkpoint = this.checkpoints[this.nextCheckpoint];
        
        // Simple distance-based collision for MVP
        const distance = aircraftPos.distanceTo(
            new THREE.Vector3(
                checkpoint.position.x,
                checkpoint.position.y,
                checkpoint.position.z
            )
        );
        
        if (distance < 15) { // Checkpoint hit threshold
            this.hitCheckpoint(this.nextCheckpoint);
        }
    }
    
    hitCheckpoint(checkpointIndex) {
        const checkpoint = this.checkpoints[checkpointIndex];
        checkpoint.hit = true;
        checkpoint.mesh.material.color.setHex(0x888888); // Grey when hit
        
        this.checkpointsHit++;
        this.nextCheckpoint++;
        
        // Highlight next checkpoint
        if (this.nextCheckpoint < this.checkpoints.length) {
            this.checkpoints[this.nextCheckpoint].mesh.material.color.setHex(0x00ff00);
        }
        
        // Check if lap completed
        if (this.checkpointsHit === this.totalCheckpoints) {
            this.completeLap();
        }
        
        this.emit('checkpoint', { index: checkpointIndex, remaining: this.totalCheckpoints - this.checkpointsHit });
    }
    
    completeLap() {
        const lapTime = Date.now() - this.currentLapStart;
        this.lapTimes.push(lapTime);
        
        if (!this.bestLapTime || lapTime < this.bestLapTime) {
            this.bestLapTime = lapTime;
        }
        
        this.currentLap++;
        
        if (this.currentLap > this.totalLaps) {
            this.completeRace();
        } else {
            // Start next lap
            this.checkpointsHit = 0;
            this.nextCheckpoint = 0;
            this.currentLapStart = Date.now();
            
            // Reset checkpoint colors
            this.checkpoints.forEach(checkpoint => {
                checkpoint.hit = false;
                checkpoint.mesh.material.color.setHex(0x0088ff);
            });
            this.checkpoints[0].mesh.material.color.setHex(0x00ff00);
        }
        
        this.emit('lapComplete', { 
            lap: this.currentLap - 1, 
            lapTime: lapTime, 
            bestLap: this.bestLapTime 
        });
    }
    
    completeRace() {
        this.isRacing = false;
        const totalTime = Date.now() - this.raceStartTime;
        
        this.emit('raceComplete', {
            totalTime: totalTime,
            lapTimes: this.lapTimes,
            bestLapTime: this.bestLapTime
        });
    }
    
    checkCrashConditions() {
        const aircraft = this.aircraftSystem.aircraft;
        const position = aircraft.position;
        
        // Simple crash detection - below terrain or too high
        if (position.y < 5 || position.y > 200) {
            this.crash();
        }
    }
    
    crash() {
        // Reset aircraft position to last checkpoint
        const lastCheckpoint = this.checkpoints[Math.max(0, this.nextCheckpoint - 1)];
        const resetPos = lastCheckpoint.position;
        
        this.aircraftSystem.aircraft.position.set(
            resetPos.x,
            resetPos.y + 10,
            resetPos.z + 20
        );
        
        // Reset velocity
        this.aircraftSystem.velocity.set(0, 0, 0);
        this.aircraftSystem.angularVelocity.set(0, 0, 0);
        
        this.emit('crash');
    }
    
    // Event system
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }
    
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
    
    // Getters for UI
    getCurrentTime() {
        if (!this.isRacing) return 0;
        return Date.now() - this.currentLapStart;
    }
    
    getTotalTime() {
        if (!this.isRacing) return 0;
        return Date.now() - this.raceStartTime;
    }
    
    getProgress() {
        return {
            lap: this.currentLap,
            totalLaps: this.totalLaps,
            checkpoints: this.checkpointsHit,
            totalCheckpoints: this.totalCheckpoints,
            nextCheckpoint: this.nextCheckpoint
        };
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RaceManager;
} else {
    window.RaceManager = RaceManager;
}
