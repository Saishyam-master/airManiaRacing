import * as THREE from 'three';

export class CrashEffects {
    constructor(scene) {
        this.scene = scene;
        this.crashActive = false;
        this.smokeParticles = null;
        // Removed fire and explosion components for cleaner smoke-only effects
        this.crashSound = null;
        
        // Particle system properties
        this.smokeTexture = null;
        this.particleCount = 150; // Reduced for cleaner stream
        this.smokeLifetime = 3.0; // Shorter lifetime - 3 seconds instead of 5
        this.particleStartTime = [];
        
        console.log('Smoke-only Crash Effects system initialized');
    }

    async init() {
        try {
            await this.loadSmokeTexture();
            this.createParticleSystems();
            console.log('Smoke-only Crash Effects ready');
        } catch (error) {
            console.error('Error initializing crash effects:', error);
        }
    }

    async loadSmokeTexture() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                'visuals/smoke.png', // Correct path to smoke texture
                (texture) => {
                    this.smokeTexture = texture;
                    console.log('Smoke texture loaded successfully from visuals/smoke.png');
                    resolve();
                },
                (progress) => {
                    console.log('Loading smoke texture:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('Error loading smoke texture from visuals/smoke.png:', error);
                    // Create fallback texture if smoke.png not found
                    this.createFallbackTexture();
                    resolve();
                }
            );
        });
    }

    createFallbackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Create realistic smoke gradient
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(220, 220, 220, 0.8)'); // Light gray center
        gradient.addColorStop(0.4, 'rgba(180, 180, 180, 0.6)'); // Medium gray
        gradient.addColorStop(0.7, 'rgba(140, 140, 140, 0.3)'); // Darker gray
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)'); // Transparent edge
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        this.smokeTexture = new THREE.CanvasTexture(canvas);
        console.log('Created realistic fallback smoke texture');
    }

    createParticleSystems() {
        // Smoke-only particle system for cleaner, more realistic effects
        this.createSmokeSystem();
        
        console.log('Smoke-only crash effects system created');
    }

    createSmokeSystem() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        const velocities = new Float32Array(this.particleCount * 3);
        
        // Initialize particle data
        for (let i = 0; i < this.particleCount; i++) {
            // Position (will be set at crash location)
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            // Realistic gray colors for smoke
            const gray = 0.4 + Math.random() * 0.3; // Darker, more realistic gray
            colors[i * 3] = gray;     // R
            colors[i * 3 + 1] = gray; // G
            colors[i * 3 + 2] = gray; // B
            
            // Varied sizes for more realistic smoke
            sizes[i] = Math.random() * 15 + 10;
            
            // Random velocities (upward and outward)
            velocities[i * 3] = (Math.random() - 0.5) * 2;     // X
            velocities[i * 3 + 1] = Math.random() * 3 + 1;     // Y (upward)
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 2; // Z
            
            // Initialize start times
            this.particleStartTime[i] = -1; // Not started
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Store velocities as custom attribute
        this.smokeVelocities = velocities;
        
        const material = new THREE.PointsMaterial({
            size: 25, // Larger for more realistic smoke
            map: this.smokeTexture,
            alphaTest: 0.05, // Lower alpha test for softer edges
            transparent: true,
            vertexColors: true,
            blending: THREE.NormalBlending, // More realistic blending
            depthWrite: false,
            opacity: 0.6 // Slightly transparent for realistic smoke
        });
        
        this.smokeParticles = new THREE.Points(geometry, material);
        this.smokeParticles.visible = false;
        this.scene.add(this.smokeParticles);
        
        console.log('Enhanced smoke particle system created');
    }

    // Enhanced smoke-only crash effects for realistic impact visualization
    triggerCrash(position) {
        console.log('SMOKE-ONLY CRASH EFFECTS TRIGGERED at position:', position);
        
        this.crashActive = true;
        this.crashStartTime = Date.now();
        
        // Position smoke effects at crash location
        this.smokeParticles.position.copy(position);
        
        // Reset and start smoke particle system
        this.resetSmokeParticles(position);
        
        // Make smoke effects visible
        this.smokeParticles.visible = true;
        
        console.log('Realistic smoke effects activated');
        
        // Auto-cleanup after duration
        setTimeout(() => {
            this.stopCrashEffects();
        }, 12000); // 12 seconds of smoke effects
    }

    triggerAircraftCrash(position, severity = 50) {
        console.log('AIRCRAFT SMOKE CRASH EFFECTS TRIGGERED!');
        console.log('Position:', position);
        console.log('Severity:', severity);
        
        // Scale smoke effects based on severity
        const intensityScale = Math.min(severity / 100, 2.0); // Cap at 2x intensity
        
        this.crashActive = true;
        this.crashStartTime = Date.now();
        
        // Position smoke effects at crash location
        this.smokeParticles.position.copy(position);
        
        // Reset and start smoke particle system with scaled intensity
        this.resetSmokeParticles(position, intensityScale);
        
        // Make smoke effects visible
        if (this.smokeParticles) this.smokeParticles.visible = true;
        
        console.log('Realistic smoke crash effects activated and visible');
        
        // Auto-cleanup after duration (longer for more severe crashes)
        const effectDuration = 10000 + (severity * 50); // 10-15 seconds based on severity
        setTimeout(() => {
            this.stopCrashEffects();
        }, effectDuration);
    }

    // Part-specific crash effects for enhanced collision detection (smoke-only)
    triggerPartSpecificCrash(position, severity = 50, collisionPart = 'fuselage') {
        console.log(`PART-SPECIFIC SMOKE CRASH EFFECTS TRIGGERED! Part: ${collisionPart}`);
        console.log('Position:', position);
        console.log('Severity:', severity);
        
        // Scale smoke effects based on severity and part type
        let intensityScale = Math.min(severity / 100, 2.0); // Cap at 2x intensity
        
        // Modify smoke effects based on collision part
        switch(collisionPart) {
            case 'leftWing':
            case 'rightWing':
                // Wing strikes create more dispersed smoke
                intensityScale *= 1.4;
                console.log('Wing strike - enhanced dispersed smoke');
                break;
            case 'nose':
                // Nose impacts create concentrated smoke
                intensityScale *= 1.2;
                console.log('Nose impact - concentrated smoke');
                break;
            case 'tail':
                // Tail strikes create longer smoke trail
                intensityScale *= 1.3;
                console.log('Tail strike - extended smoke trail');
                break;
            default:
                console.log('General fuselage impact - standard smoke');
        }
        
        this.crashActive = true;
        this.crashStartTime = Date.now();
        
        // Position smoke effects at crash location
        this.smokeParticles.position.copy(position);
        
        // Reset and start smoke particle system with part-specific intensity
        this.resetSmokeParticles(position, intensityScale);
        
        // Make smoke effects visible
        if (this.smokeParticles) this.smokeParticles.visible = true;
        
        console.log(`${collisionPart} smoke crash effects activated and visible`);
        
        // Auto-cleanup after duration (longer for more severe crashes)
        const effectDuration = 10000 + (severity * 50); // 10-15 seconds based on severity
        setTimeout(() => {
            this.stopCrashEffects();
        }, effectDuration);
    }

    resetSmokeParticles(crashPosition, intensityScale = 1.0) {
        const positions = this.smokeParticles.geometry.attributes.position.array;
        const currentTime = Date.now() / 1000;
        const spread = 6 * intensityScale; // Scale the particle spread
        
        for (let i = 0; i < this.particleCount; i++) {
            // Reset positions to crash site with scaled random offset
            positions[i * 3] = (Math.random() - 0.5) * spread;     // X spread
            positions[i * 3 + 1] = Math.random() * 2;              // Y start low
            positions[i * 3 + 2] = (Math.random() - 0.5) * spread; // Z spread
            
            // Stagger particle start times for continuous effect
            this.particleStartTime[i] = currentTime + Math.random() * 2;
        }
        
        this.smokeParticles.geometry.attributes.position.needsUpdate = true;
    }

    update(deltaTime) {
        if (!this.crashActive) return;
        
        // Only update smoke particles for cleaner, more realistic effects
        this.updateSmokeParticles(deltaTime);
    }

    updateSmokeParticles(deltaTime) {
        if (!this.smokeParticles.visible) return;
        
        const positions = this.smokeParticles.geometry.attributes.position.array;
        const sizes = this.smokeParticles.geometry.attributes.size.array;
        const currentTime = Date.now() / 1000;
        
        for (let i = 0; i < this.particleCount; i++) {
            const startTime = this.particleStartTime[i];
            
            if (currentTime < startTime) continue; // Not started yet
            
            const age = currentTime - startTime;
            
            if (age > this.smokeLifetime) {
                // Restart particle
                positions[i * 3] = (Math.random() - 0.5) * 4; // Tighter spawn area
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
                this.particleStartTime[i] = currentTime;
                sizes[i] = Math.random() * 12 + 8; // Smaller initial size
            } else {
                // Update particle position - more upward focus
                positions[i * 3] += this.smokeVelocities[i * 3] * deltaTime * 0.7; // Reduced horizontal drift
                positions[i * 3 + 1] += this.smokeVelocities[i * 3 + 1] * deltaTime * 1.2; // Increased upward velocity
                positions[i * 3 + 2] += this.smokeVelocities[i * 3 + 2] * deltaTime * 0.7;
                
                // Grow particle size over time but slower for cleaner stream
                sizes[i] += deltaTime * 6; // Reduced from 8
                
                // Lighter wind effect for more controlled stream
                positions[i * 3] += Math.sin(currentTime + i) * deltaTime * 0.4; // Reduced from 0.7
            }
        }
        
        this.smokeParticles.geometry.attributes.position.needsUpdate = true;
        this.smokeParticles.geometry.attributes.size.needsUpdate = true;
    }

    stopCrashEffects() {
        console.log('Stopping smoke crash effects');
        
        this.crashActive = false;
        
        // Only hide smoke particles
        if (this.smokeParticles) this.smokeParticles.visible = false;
    }

    // Check if crash effects are currently active
    isCrashActive() {
        return this.crashActive;
    }

    // Cleanup method for smoke-only effects
    dispose() {
        if (this.smokeParticles) {
            this.scene.remove(this.smokeParticles);
            this.smokeParticles.geometry.dispose();
            this.smokeParticles.material.dispose();
        }
        
        if (this.smokeTexture) {
            this.smokeTexture.dispose();
        }
        
        console.log('Smoke crash effects disposed');
    }
}
