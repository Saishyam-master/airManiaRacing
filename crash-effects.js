import * as THREE from 'three';

export class CrashEffects {
    constructor(scene) {
        this.scene = scene;
        this.crashActive = false;
        this.smokeParticles = null;
        this.fireParticles = null;
        this.explosionLight = null;
        this.crashSound = null;
        
        // Particle system properties
        this.smokeTexture = null;
        this.particleCount = 200;
        this.smokeLifetime = 5.0; // seconds
        this.particleStartTime = [];
        
        console.log('Crash Effects system initialized');
    }

    async init() {
        try {
            await this.loadSmokeTexture();
            this.createParticleSystems();
            console.log('Crash Effects ready');
        } catch (error) {
            console.error('Error initializing crash effects:', error);
        }
    }

    async loadSmokeTexture() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                'assets/smoke.png', // Correct path to smoke texture
                (texture) => {
                    this.smokeTexture = texture;
                    console.log('Smoke texture loaded successfully');
                    resolve();
                },
                (progress) => {
                    console.log('Loading smoke texture:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('Error loading smoke texture:', error);
                    // Create fallback texture if smoke.png not found
                    this.createFallbackTexture();
                    resolve();
                }
            );
        });
    }

    createFallbackTexture() {
        // Create a simple gray circle texture as fallback
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Create gradient circle
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(100, 100, 100, 1)');
        gradient.addColorStop(0.5, 'rgba(80, 80, 80, 0.8)');
        gradient.addColorStop(1, 'rgba(60, 60, 60, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        this.smokeTexture = new THREE.CanvasTexture(canvas);
        console.log('Created fallback smoke texture');
    }

    createParticleSystems() {
        // Smoke particle system
        this.createSmokeSystem();
        
        // Fire particle system  
        this.createFireSystem();
        
        // Explosion light
        this.createExplosionLight();
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
            
            // Random gray colors for smoke
            const gray = 0.3 + Math.random() * 0.4;
            colors[i * 3] = gray;     // R
            colors[i * 3 + 1] = gray; // G
            colors[i * 3 + 2] = gray; // B
            
            // Random sizes
            sizes[i] = Math.random() * 10 + 5;
            
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
            size: 15,
            map: this.smokeTexture,
            alphaTest: 0.1,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.smokeParticles = new THREE.Points(geometry, material);
        this.smokeParticles.visible = false;
        this.scene.add(this.smokeParticles);
        
        console.log('Smoke particle system created');
    }

    createFireSystem() {
        const geometry = new THREE.BufferGeometry();
        const fireParticleCount = 50;
        const positions = new Float32Array(fireParticleCount * 3);
        const colors = new Float32Array(fireParticleCount * 3);
        const sizes = new Float32Array(fireParticleCount);
        
        for (let i = 0; i < fireParticleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            // Orange/red colors for fire
            colors[i * 3] = 1.0;     // R
            colors[i * 3 + 1] = Math.random() * 0.5 + 0.5; // G
            colors[i * 3 + 2] = 0.0; // B
            
            sizes[i] = Math.random() * 5 + 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 8,
            alphaTest: 0.1,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.fireParticles = new THREE.Points(geometry, material);
        this.fireParticles.visible = false;
        this.scene.add(this.fireParticles);
        
        console.log('Fire particle system created');
    }

    createExplosionLight() {
        this.explosionLight = new THREE.PointLight(0xff4400, 0, 100);
        this.explosionLight.visible = false;
        this.scene.add(this.explosionLight);
        
        console.log('Explosion light created');
    }

    triggerCrash(position) {
        console.log('CRASH EFFECTS TRIGGERED at position:', position);
        
        this.crashActive = true;
        this.crashStartTime = Date.now();
        
        // Position all effects at crash location
        this.positionEffectsAtCrash(position);
        
        // Start explosion light
        this.startExplosionLight(position);
        
        // Reset and start particle systems
        this.resetSmokeParticles(position);
        this.resetFireParticles(position);
        
        // Make effects visible
        this.smokeParticles.visible = true;
        this.fireParticles.visible = true;
        this.explosionLight.visible = true;
        
        // Auto-cleanup after duration
        setTimeout(() => {
            this.stopCrashEffects();
        }, 10000); // 10 seconds of effects
    }

    positionEffectsAtCrash(position) {
        this.smokeParticles.position.copy(position);
        this.fireParticles.position.copy(position);
        this.explosionLight.position.copy(position);
    }

    triggerAircraftCrash(position, severity = 50) {
        console.log('AIRCRAFT CRASH EFFECTS TRIGGERED!');
        console.log('Position:', position);
        console.log('Severity:', severity);
        
        // Scale effects based on severity
        const intensityScale = Math.min(severity / 100, 2.0); // Cap at 2x intensity
        
        this.crashActive = true;
        this.crashStartTime = Date.now();
        
        // Position all effects at crash location
        this.positionEffectsAtCrash(position);
        
        // Start explosion light with severity-based intensity
        this.startExplosionLight(position, intensityScale);
        
        // Reset and start particle systems with scaled intensity
        this.resetSmokeParticles(position, intensityScale);
        this.resetFireParticles(position, intensityScale);
        
        // Make effects visible
        if (this.smokeParticles) this.smokeParticles.visible = true;
        if (this.fireParticles) this.fireParticles.visible = true;
        if (this.explosionLight) this.explosionLight.visible = true;
        
        console.log('Crash effects activated and visible');
        
        // Auto-cleanup after duration (longer for more severe crashes)
        const effectDuration = 8000 + (severity * 40); // 8-12 seconds based on severity
        setTimeout(() => {
            this.stopCrashEffects();
        }, effectDuration);
    }

    resetSmokeParticles(crashPosition, intensityScale = 1.0) {
        const positions = this.smokeParticles.geometry.attributes.position.array;
        const currentTime = Date.now() / 1000;
        const spread = 5 * intensityScale; // Scale the particle spread
        
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

    resetFireParticles(crashPosition, intensityScale = 1.0) {
        const positions = this.fireParticles.geometry.attributes.position.array;
        const spread = 3 * intensityScale; // Scale the fire spread
        
        for (let i = 0; i < 50; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 1] = Math.random();
            positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
        }
        
        this.fireParticles.geometry.attributes.position.needsUpdate = true;
    }

    startExplosionLight(position, intensityScale = 1.0) {
        this.explosionLight.intensity = 3 * intensityScale;
        this.explosionLight.distance = 50 * intensityScale;
        
        // Fade out explosion light over time
        const fadeInterval = setInterval(() => {
            this.explosionLight.intensity *= 0.9;
            if (this.explosionLight.intensity < 0.1) {
                this.explosionLight.visible = false;
                clearInterval(fadeInterval);
            }
        }, 100);
    }

    update(deltaTime) {
        if (!this.crashActive) return;
        
        this.updateSmokeParticles(deltaTime);
        this.updateFireParticles(deltaTime);
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
                positions[i * 3] = (Math.random() - 0.5) * 5;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
                this.particleStartTime[i] = currentTime;
                sizes[i] = Math.random() * 10 + 5;
            } else {
                // Update particle position
                positions[i * 3] += this.smokeVelocities[i * 3] * deltaTime;
                positions[i * 3 + 1] += this.smokeVelocities[i * 3 + 1] * deltaTime;
                positions[i * 3 + 2] += this.smokeVelocities[i * 3 + 2] * deltaTime;
                
                // Grow particle size over time
                sizes[i] += deltaTime * 5;
                
                // Add wind effect
                positions[i * 3] += Math.sin(currentTime + i) * deltaTime * 0.5;
            }
        }
        
        this.smokeParticles.geometry.attributes.position.needsUpdate = true;
        this.smokeParticles.geometry.attributes.size.needsUpdate = true;
    }

    updateFireParticles(deltaTime) {
        if (!this.fireParticles.visible) return;
        
        const positions = this.fireParticles.geometry.attributes.position.array;
        
        for (let i = 0; i < 50; i++) {
            // Fire flickers and moves upward
            positions[i * 3] += (Math.random() - 0.5) * deltaTime * 2;
            positions[i * 3 + 1] += deltaTime * 3;
            positions[i * 3 + 2] += (Math.random() - 0.5) * deltaTime * 2;
            
            // Reset if too high
            if (positions[i * 3 + 1] > 10) {
                positions[i * 3] = (Math.random() - 0.5) * 3;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
            }
        }
        
        this.fireParticles.geometry.attributes.position.needsUpdate = true;
    }

    stopCrashEffects() {
        console.log('Stopping crash effects');
        
        this.crashActive = false;
        
        if (this.smokeParticles) this.smokeParticles.visible = false;
        if (this.fireParticles) this.fireParticles.visible = false;
        if (this.explosionLight) this.explosionLight.visible = false;
    }

    // Check if crash effects are currently active
    isCrashActive() {
        return this.crashActive;
    }

    // Cleanup method
    dispose() {
        if (this.smokeParticles) {
            this.scene.remove(this.smokeParticles);
            this.smokeParticles.geometry.dispose();
            this.smokeParticles.material.dispose();
        }
        
        if (this.fireParticles) {
            this.scene.remove(this.fireParticles);
            this.fireParticles.geometry.dispose();
            this.fireParticles.material.dispose();
        }
        
        if (this.explosionLight) {
            this.scene.remove(this.explosionLight);
        }
        
        if (this.smokeTexture) {
            this.smokeTexture.dispose();
        }
        
        console.log('Crash effects disposed');
    }
}
