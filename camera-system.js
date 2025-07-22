import * as THREE from 'three';

export class CameraSystem {
    constructor(camera, scene, environment) {
        this.camera = camera;
        this.scene = scene;
        this.environment = environment;
        
        // Camera modes
        this.mode = 'follow'; // 'follow', 'crash', 'cinematic'
        this.previousMode = 'follow';
        
        // Follow camera properties
        this.followOffset = new THREE.Vector3(0, 4, 12);
        this.lookAheadOffset = new THREE.Vector3(0, 0, -5);
        this.followSmoothing = 0.12; // Increased from 0.08 for snappier following
        
        // Crash camera properties
        this.crashActive = false;
        this.crashStartTime = 0;
        this.crashDuration = 2500; // 2.5 seconds of crash cam (reduced from 5)
        this.crashCameraPosition = new THREE.Vector3();
        this.crashLookTarget = new THREE.Vector3();
        this.crashCameraDistance = 25; // Distance from crash site
        this.crashCameraHeight = 15; // Height above crash site
        
        // Cinematic camera properties
        this.cinematicStartTime = 0;
        this.cinematicDuration = 1500; // 1.5 seconds of cinematic approach (reduced from 3)
        this.cinematicStartPosition = new THREE.Vector3();
        this.cinematicEndPosition = new THREE.Vector3();
        
        // Animation state
        this.animationPhase = 'none'; // 'none', 'approaching', 'orbiting', 'settling'
        
        console.log('Camera system initialized');
    }
    
    update(deltaTime, aircraft) {
        if (!aircraft) return;
        
        switch (this.mode) {
            case 'follow':
                this.updateFollowCamera(aircraft);
                break;
            case 'crash':
                this.updateCrashCamera(aircraft, deltaTime);
                break;
            case 'cinematic':
                this.updateCinematicCamera(aircraft, deltaTime);
                break;
        }
    }
    
    updateFollowCamera(aircraft) {
        // Standard follow camera behavior
        const cameraOffset = this.followOffset.clone();
        cameraOffset.applyQuaternion(aircraft.quaternion);
        
        const idealCameraPosition = aircraft.position.clone().add(cameraOffset);
        
        // Ensure camera doesn't go below terrain
        const terrainHeight = this.environment.getTerrainHeightAt(idealCameraPosition.x, idealCameraPosition.z);
        idealCameraPosition.y = Math.max(idealCameraPosition.y, terrainHeight + 3);
        
        // Smooth camera movement
        this.camera.position.lerp(idealCameraPosition, this.followSmoothing);
        
        // Look slightly ahead of the aircraft
        const lookAhead = this.lookAheadOffset.clone();
        lookAhead.applyQuaternion(aircraft.quaternion);
        const lookTarget = aircraft.position.clone().add(lookAhead);
        
        this.camera.lookAt(lookTarget);
    }
    
    updateCrashCamera(aircraft, deltaTime) {
        const currentTime = Date.now();
        const crashElapsed = currentTime - this.crashStartTime;
        
        if (crashElapsed >= this.crashDuration) {
            // Return to follow mode after crash sequence
            this.mode = 'follow';
            this.crashActive = false;
            console.log('Crash camera sequence completed, returning to follow mode');
            return;
        }
        
        // Different phases of crash camera (faster pacing)
        const phase1Duration = 800;  // 0.8 seconds: quick dramatic approach (reduced from 1.5)
        const phase2Duration = 1000; // 1 second: brief close inspection (reduced from 2)
        const phase3Duration = 700;  // 0.7 seconds: quick pull back overview (reduced from 1.5)
        
        if (crashElapsed < phase1Duration) {
            // Phase 1: Quick dramatic approach to crash site
            this.updateCrashPhase1(aircraft, crashElapsed / phase1Duration);
        } else if (crashElapsed < phase1Duration + phase2Duration) {
            // Phase 2: Brief close-up inspection of damage
            const phase2Progress = (crashElapsed - phase1Duration) / phase2Duration;
            this.updateCrashPhase2(aircraft, phase2Progress);
        } else {
            // Phase 3: Quick pull back for overview
            const phase3Progress = (crashElapsed - phase1Duration - phase2Duration) / phase3Duration;
            this.updateCrashPhase3(aircraft, phase3Progress);
        }
    }
    
    updateCrashPhase1(aircraft, progress) {
        // Dramatic swooping approach to crash site
        const easeProgress = this.easeInOutCubic(progress);
        
        // Start from current camera position, swoop down to optimal viewing angle
        const startPos = this.cinematicStartPosition.clone();
        const endPos = this.crashCameraPosition.clone();
        
        // Add some dramatic height variation
        const heightCurve = Math.sin(progress * Math.PI) * 8; // Swooping motion
        endPos.y += heightCurve;
        
        this.camera.position.lerpVectors(startPos, endPos, easeProgress);
        this.camera.lookAt(aircraft.position);
    }
    
    updateCrashPhase2(aircraft, progress) {
        // Faster orbiting close inspection
        const orbitRadius = 12;
        const orbitHeight = 6;
        const orbitSpeed = progress * Math.PI * 3; // 1.5 orbits for more dynamic movement (increased from 2)
        
        const crashSite = aircraft.position.clone();
        
        // Orbit around the crash site
        const orbitX = crashSite.x + Math.cos(orbitSpeed) * orbitRadius;
        const orbitZ = crashSite.z + Math.sin(orbitSpeed) * orbitRadius;
        const orbitY = crashSite.y + orbitHeight;
        
        // Ensure camera doesn't clip into terrain
        const terrainHeight = this.environment.getTerrainHeightAt(orbitX, orbitZ);
        const safeY = Math.max(orbitY, terrainHeight + 3);
        
        this.camera.position.set(orbitX, safeY, orbitZ);
        
        // Look at crash with slight anticipation ahead
        const lookTarget = crashSite.clone();
        lookTarget.y += 2; // Look slightly above the wreckage
        this.camera.lookAt(lookTarget);
    }
    
    updateCrashPhase3(aircraft, progress) {
        // Pull back for overview shot
        const easeProgress = this.easeInOutCubic(progress);
        
        const startPos = this.camera.position.clone();
        const pullBackDistance = 40;
        const pullBackHeight = 25;
        
        // Calculate pull-back position that avoids terrain
        const crashSite = aircraft.position.clone();
        const pullBackDirection = new THREE.Vector3(1, 0, 1).normalize(); // Diagonal pull-back
        const endPos = crashSite.clone().add(pullBackDirection.multiplyScalar(pullBackDistance));
        endPos.y = crashSite.y + pullBackHeight;
        
        // Ensure final position is safe from terrain
        const terrainHeight = this.environment.getTerrainHeightAt(endPos.x, endPos.z);
        endPos.y = Math.max(endPos.y, terrainHeight + 5);
        
        this.camera.position.lerpVectors(startPos, endPos, easeProgress);
        this.camera.lookAt(crashSite);
    }
    
    triggerCrashCamera(aircraft, collisionPart = 'fuselage') {
        console.log(`Triggering crash camera for ${collisionPart} collision`);
        
        this.previousMode = this.mode;
        this.mode = 'crash';
        this.crashActive = true;
        this.crashStartTime = Date.now();
        
        // Store current camera position as starting point
        this.cinematicStartPosition.copy(this.camera.position);
        
        // Calculate optimal crash viewing position based on collision part and terrain
        this.calculateOptimalCrashViewingPosition(aircraft, collisionPart);
        
        console.log(`Crash camera positioned at optimal viewing angle for ${collisionPart} impact`);
    }
    
    calculateOptimalCrashViewingPosition(aircraft, collisionPart) {
        const crashSite = aircraft.position.clone();
        
        // Base viewing distance and angle based on collision type
        let viewingDistance = this.crashCameraDistance;
        let viewingHeight = this.crashCameraHeight;
        let viewingAngle = 0; // Angle around the crash site
        
        // Adjust camera position based on collision part for best dramatic effect
        switch(collisionPart) {
            case 'leftWing':
                // Position camera to see the left side cartwheel
                viewingAngle = Math.PI * 0.75; // 135 degrees - from left-back
                viewingDistance = 20;
                viewingHeight = 12;
                break;
                
            case 'rightWing':
                // Position camera to see the right side cartwheel
                viewingAngle = Math.PI * 0.25; // 45 degrees - from right-back
                viewingDistance = 20;
                viewingHeight = 12;
                break;
                
            case 'nose':
                // Position camera to see the dramatic nose-down crash
                viewingAngle = Math.PI; // 180 degrees - from behind
                viewingDistance = 18;
                viewingHeight = 8; // Lower to see the nose impact better
                break;
                
            case 'tail':
                // Position camera to see the tail strike and nose-up attitude
                viewingAngle = 0; // 0 degrees - from front
                viewingDistance = 22;
                viewingHeight = 15; // Higher to see the nose-up attitude
                break;
                
            default: // fuselage
                // General side view for sliding crash
                viewingAngle = Math.PI * 0.5; // 90 degrees - from the side
                viewingDistance = 25;
                viewingHeight = 12;
        }
        
        // Calculate camera position
        const cameraX = crashSite.x + Math.cos(viewingAngle) * viewingDistance;
        const cameraZ = crashSite.z + Math.sin(viewingAngle) * viewingDistance;
        let cameraY = crashSite.y + viewingHeight;
        
        // Ensure camera position is safe from terrain
        const terrainHeight = this.environment.getTerrainHeightAt(cameraX, cameraZ);
        cameraY = Math.max(cameraY, terrainHeight + 5);
        
        // Try alternative positions if this one clips into terrain
        let attempts = 0;
        while (cameraY - terrainHeight < 5 && attempts < 4) {
            // Try different angles if terrain is problematic
            viewingAngle += Math.PI * 0.25; // Rotate 45 degrees
            const newCameraX = crashSite.x + Math.cos(viewingAngle) * viewingDistance;
            const newCameraZ = crashSite.z + Math.sin(viewingAngle) * viewingDistance;
            const newTerrainHeight = this.environment.getTerrainHeightAt(newCameraX, newCameraZ);
            
            if (newTerrainHeight < terrainHeight) {
                // This position is better
                cameraX = newCameraX;
                cameraZ = newCameraZ;
                terrainHeight = newTerrainHeight;
                cameraY = crashSite.y + viewingHeight;
                cameraY = Math.max(cameraY, terrainHeight + 5);
            }
            attempts++;
        }
        
        this.crashCameraPosition.set(cameraX, cameraY, cameraZ);
        this.crashLookTarget.copy(crashSite);
        
        console.log(`Crash camera positioned at (${cameraX.toFixed(1)}, ${cameraY.toFixed(1)}, ${cameraZ.toFixed(1)}) for ${collisionPart} impact`);
    }
    
    // Switch back to follow mode (for reset)
    setFollowMode() {
        this.mode = 'follow';
        this.crashActive = false;
        console.log('Camera switched to follow mode');
    }
    
    // Easing function for smooth animations
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Get current camera info for debugging
    getCameraInfo() {
        return {
            mode: this.mode,
            position: {
                x: Math.round(this.camera.position.x),
                y: Math.round(this.camera.position.y),
                z: Math.round(this.camera.position.z)
            },
            crashActive: this.crashActive,
            animationPhase: this.animationPhase
        };
    }
}
