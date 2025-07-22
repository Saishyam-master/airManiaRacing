import * as THREE from 'three';

export class CrashEffects {
    constructor() {
        this.explosionParticles = [];
        this.smokeParticles = [];
        this.debrisParticles = [];
        this.crashCutsceneActive = false;
        this.crashCameraTarget = new THREE.Vector3();
        this.originalCameraPosition = new THREE.Vector3();
        this.originalCameraTarget = new THREE.Vector3();
        this.cutsceneStartTime = 0;
        this.cutsceneDuration = 4000; // Extended to 4 seconds for better experience
        this.screenShakeIntensity = 0;
        this.screenShakeDecay = 0.95;
        
        // Enhanced crash features
        this.crashSoundPlayed = false;
        this.crashCount = 0;
        this.lastCrashTime = 0;
        this.cinematicCameraActive = false;
        this.cameraOrbitAngle = 0;
        
        // Crash statistics tracking
        this.crashStats = {
            totalCrashes: 0,
            fastestRespawn: Infinity,
            crashLocations: []
        };
    }

    triggerCrashCutscene(crashPosition, aircraft) {
        if (this.crashCutsceneActive) return;
        
        console.log('🔥 CRASH DETECTED! Starting enhanced cutscene...');
        this.crashCutsceneActive = true;
        this.cinematicCameraActive = true;
        this.cutsceneStartTime = Date.now();
        this.crashCount++;
        this.lastCrashTime = Date.now();
        
        // Update crash statistics
        this.crashStats.totalCrashes++;
        this.crashStats.crashLocations.push({
            position: crashPosition.clone(),
            time: Date.now(),
            speed: aircraft.velocity.length()
        });
        
        // Store original camera state
        if (window.camera) {
            this.originalCameraPosition.copy(window.camera.position);
            this.originalCameraTarget.copy(window.cameraTarget || new THREE.Vector3());
        }
        
        // Set crash camera position for dramatic effect
        this.crashCameraTarget.copy(crashPosition);
        
        // Create multiple explosion effects
        this.createExplosionEffect(crashPosition);
        this.createSmokeEffect(crashPosition);
        this.createDebrisEffect(crashPosition);
        
        // Enhanced screen effects
        this.startScreenShake();
        this.startScreenFlash();
        
        // Show enhanced crash UI
        this.showCrashUI();
        
        // Play crash sound effect (simulated)
        this.playCrashSound();
        
        // Auto-respawn after cutscene
        setTimeout(() => {
            this.endCrashCutscene(aircraft);
        }, this.cutsceneDuration);
    }

    createExplosionEffect(position) {
        // Create multiple explosion particles with enhanced effects
        for (let i = 0; i < 75; i++) { // Increased from 50 to 75
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(Math.random() * 3 + 0.5), // Varied sizes
                new THREE.MeshBasicMaterial({ 
                    color: new THREE.Color().setHSL(Math.random() * 0.15, 1, 0.6), // Enhanced colors
                    transparent: true,
                    opacity: 0.9
                })
            );
            
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 25,
                Math.random() * 15,
                (Math.random() - 0.5) * 25
            ));
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                Math.random() * 12 + 3,
                (Math.random() - 0.5) * 15
            );
            
            particle.userData = { 
                velocity, 
                life: 1.0,
                decay: Math.random() * 0.015 + 0.008,
                type: 'explosion'
            };
            
            if (window.scene) {
                window.scene.add(particle);
                this.explosionParticles.push(particle);
            }
        }
    }

    createSmokeEffect(position) {
        // Create smoke particles
        for (let i = 0; i < 30; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(Math.random() * 4 + 2),
                new THREE.MeshBasicMaterial({ 
                    color: new THREE.Color(0.3, 0.3, 0.3),
                    transparent: true,
                    opacity: 0.6
                })
            );
            
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 5,
                (Math.random() - 0.5) * 10
            ));
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 8 + 5, // Smoke rises
                (Math.random() - 0.5) * 3
            );
            
            particle.userData = { 
                velocity, 
                life: 1.0,
                decay: Math.random() * 0.01 + 0.005,
                type: 'smoke'
            };
            
            if (window.scene) {
                window.scene.add(particle);
                this.smokeParticles.push(particle);
            }
        }
    }

    createDebrisEffect(position) {
        // Create debris particles
        for (let i = 0; i < 20; i++) {
            const particle = new THREE.Mesh(
                new THREE.BoxGeometry(
                    Math.random() * 2 + 0.5,
                    Math.random() * 2 + 0.5,
                    Math.random() * 2 + 0.5
                ),
                new THREE.MeshBasicMaterial({ 
                    color: new THREE.Color(0.4, 0.4, 0.4),
                    transparent: true,
                    opacity: 0.8
                })
            );
            
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                Math.random() * 8,
                (Math.random() - 0.5) * 15
            ));
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                Math.random() * 10 + 2,
                (Math.random() - 0.5) * 12
            );
            
            particle.userData = { 
                velocity, 
                life: 1.0,
                decay: Math.random() * 0.008 + 0.004,
                type: 'debris',
                angularVelocity: new THREE.Vector3(
                    Math.random() * 0.2,
                    Math.random() * 0.2,
                    Math.random() * 0.2
                )
            };
            
            if (window.scene) {
                window.scene.add(particle);
                this.debrisParticles.push(particle);
            }
        }
    }

    startScreenFlash() {
        // Create white flash overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'white';
        overlay.style.opacity = '0.8';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9999';
        overlay.style.transition = 'opacity 0.5s ease-out';
        
        document.body.appendChild(overlay);
        
        // Fade out the flash
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 500);
        }, 100);
    }

    playCrashSound() {
        // Play crash sound if audio system is available
        if (window.audioManager && typeof window.audioManager.playSound === 'function') {
            window.audioManager.playSound('crash');
        } else {
            console.log('Audio manager not available for crash sound');
        }
    }

    activateCinematicCamera(crashPosition) {
        if (!window.camera || !window.scene) return;
        
        this.cinematicCameraActive = true;
        this.originalCameraPosition = window.camera.position.clone();
        this.originalCameraTarget = window.camera.lookAt ? window.camera.getWorldDirection(new THREE.Vector3()) : new THREE.Vector3(0, 0, -1);
        
        // Position camera for dramatic angle
        const offset = new THREE.Vector3(50, 30, 50);
        window.camera.position.copy(crashPosition).add(offset);
        
        // Look at crash site
        if (window.camera.lookAt) {
            window.camera.lookAt(crashPosition);
        }
        
        // Add camera shake
        this.startCameraShake();
    }

    startCameraShake() {
        this.shakeAmount = 15; // Increased shake intensity
        this.shakeDuration = 3000; // 3 seconds
        this.shakeStartTime = Date.now();
    }

    updateCameraShake() {
        if (this.shakeAmount <= 0 || !window.camera) return;
        
        const elapsed = Date.now() - this.shakeStartTime;
        if (elapsed > this.shakeDuration) {
            this.shakeAmount = 0;
            return;
        }
        
        const intensity = this.shakeAmount * (1 - elapsed / this.shakeDuration);
        
        window.camera.position.x += (Math.random() - 0.5) * intensity;
        window.camera.position.y += (Math.random() - 0.5) * intensity;
        window.camera.position.z += (Math.random() - 0.5) * intensity;
    }

    startScreenShake() {
        this.screenShakeIntensity = 0.5;
    }

    showCrashUI() {
        // Create crash overlay
        const crashOverlay = document.createElement('div');
        crashOverlay.id = 'crashOverlay';
        crashOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: 'Arial', sans-serif;
            animation: crashFade 0.5s ease-in;
        `;
        
        crashOverlay.innerHTML = `
            <div style="text-align: center;">
                <h1 style="font-size: 4rem; color: #ff4444; text-shadow: 0 0 20px #ff0000; margin: 0; animation: crashPulse 1s ease-in-out infinite;">
                    CRASHED!
                </h1>
                <p style="font-size: 1.5rem; margin: 20px 0; color: #ffffff;">
                    Your aircraft has been destroyed
                </p>
                <p style="font-size: 1rem; color: #cccccc; animation: blink 1s infinite;">
                    Respawning in <span id="respawnTimer">3</span> seconds...
                </p>
            </div>
        `;
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes crashFade {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes crashPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(crashOverlay);
        
        // Countdown timer
        let countdown = 3;
        const timerElement = document.getElementById('respawnTimer');
        const countdownInterval = setInterval(() => {
            countdown--;
            if (timerElement) timerElement.textContent = countdown;
            if (countdown <= 0) clearInterval(countdownInterval);
        }, 1000);
    }

    endCrashCutscene(aircraft) {
        console.log('✈️ Respawning aircraft...');
        this.crashCutsceneActive = false;
        this.cinematicCameraActive = false;
        
        // Remove crash UI
        const crashOverlay = document.getElementById('crashOverlay');
        if (crashOverlay) crashOverlay.remove();
        
        // Clear all particle systems
        this.clearParticleSystem(this.explosionParticles);
        this.clearParticleSystem(this.smokeParticles);
        this.clearParticleSystem(this.debrisParticles);
        
        // Reset aircraft to spawn position
        if (aircraft && window.environment) {
            const spawnPos = window.environment.getCornerSpawnPosition();
            aircraft.aircraft.position.copy(spawnPos);
            aircraft.velocity.set(0, 0, 0);
            aircraft.angularVelocity.set(0, 0, 0);
            aircraft.aircraft.quaternion.set(0, 0, 0, 1);
            
            console.log('Aircraft respawned at:', spawnPos);
        }
        
        // Restore camera
        if (window.camera) {
            window.camera.position.copy(this.originalCameraPosition);
        }
        
        // Reset screen shake
        this.screenShakeIntensity = 0;
        this.shakeAmount = 0;
        
        console.log('🎬 Enhanced crash cutscene complete!');
        console.log('📊 Total crashes this session:', this.crashStats.totalCrashes);
    }

    clearParticleSystem(particles) {
        particles.forEach(particle => {
            if (window.scene) window.scene.remove(particle);
        });
        particles.length = 0; // Clear array
    }

    updateCrashCutscene() {
        if (!this.crashCutsceneActive) return;
        
        const elapsed = Date.now() - this.cutsceneStartTime;
        const progress = elapsed / this.cutsceneDuration;
        
        // Update all particle systems
        this.updateParticleSystem(this.explosionParticles);
        this.updateParticleSystem(this.smokeParticles);
        this.updateParticleSystem(this.debrisParticles);
        
        // Update enhanced camera effects
        this.updateCameraShake();
        
        // Update cinematic camera if active
        if (this.cinematicCameraActive && window.camera) {
            this.updateCinematicCamera(progress);
        }
        
        // Update screen shake
        if (this.screenShakeIntensity > 0) {
            this.screenShakeIntensity *= this.screenShakeDecay;
            if (window.camera) {
                window.camera.position.x += (Math.random() - 0.5) * this.screenShakeIntensity;
                window.camera.position.y += (Math.random() - 0.5) * this.screenShakeIntensity;
            }
        }
    }

    updateParticleSystem(particles) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const userData = particle.userData;
            
            // Update life
            userData.life -= userData.decay;
            if (userData.life <= 0) {
                if (window.scene) window.scene.remove(particle);
                particles.splice(i, 1);
                continue;
            }
            
            // Update position
            particle.position.add(userData.velocity);
            
            // Apply physics based on particle type
            if (userData.type === 'explosion') {
                userData.velocity.multiplyScalar(0.98); // Friction
                userData.velocity.y -= 0.2; // Gravity
            } else if (userData.type === 'smoke') {
                userData.velocity.multiplyScalar(0.95); // Smoke friction
                userData.velocity.y += 0.1; // Smoke rises
            } else if (userData.type === 'debris') {
                userData.velocity.multiplyScalar(0.96); // Debris friction
                userData.velocity.y -= 0.3; // Heavier gravity
                
                // Rotate debris
                if (userData.angularVelocity) {
                    particle.rotation.x += userData.angularVelocity.x;
                    particle.rotation.y += userData.angularVelocity.y;
                    particle.rotation.z += userData.angularVelocity.z;
                }
            }
            
            // Update opacity
            particle.material.opacity = userData.life;
        }
    }

    updateCinematicCamera(progress) {
        // Smooth camera movement during cutscene
        if (progress < 1.0) {
            const smoothProgress = this.easeInOutCubic(progress);
            
            // Orbit around crash site
            const angle = smoothProgress * Math.PI * 2;
            const radius = 60 - (smoothProgress * 20); // Move closer over time
            
            const x = this.crashCameraTarget.x + Math.cos(angle) * radius;
            const z = this.crashCameraTarget.z + Math.sin(angle) * radius;
            const y = this.crashCameraTarget.y + 30 - (smoothProgress * 10);
            
            window.camera.position.set(x, y, z);
            if (window.camera.lookAt) {
                window.camera.lookAt(this.crashCameraTarget);
            }
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    checkCrashConditions(aircraft) {
        if (!aircraft || !aircraft.aircraft || !window.environment) return false;
        
        const position = aircraft.aircraft.position;
        const terrainHeight = window.environment.getTerrainHeightAt(position.x, position.z);
        
        // Check if aircraft is below terrain (crashed)
        if (position.y < terrainHeight + 5) {
            console.log(`💥 Crash detected! Aircraft at Y:${position.y.toFixed(1)}, Terrain:${terrainHeight.toFixed(1)}`);
            this.triggerCrashCutscene(position.clone(), aircraft);
            return true;
        }
        
        return false;
    }

    update() {
        this.updateCrashCutscene();
        
        // Check for crashes if aircraft exists
        if (window.aircraftSystem) {
            this.checkCrashConditions(window.aircraftSystem);
        }
    }
}
