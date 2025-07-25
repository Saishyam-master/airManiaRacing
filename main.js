import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Environment } from './environment.js'; // Using clean environment (renamed)
import { AircraftSystem } from './aircraft-system.js';
import { AircraftControls } from './controls.js';
import { DebugGrid } from './grid.js';
import { CrashEffects } from './crash-effects.js';
import { CameraSystem } from './camera-system.js';

// Game state
let scene, camera, renderer, aircraftSystem, debugGrid, crashEffects, cameraSystem;
let gameStarted = false;
let controls; // New controls system
let speed = 0;
let altitude = 500;
let score = 0;
let environment;
let frameCount = 0;

// Jet display state
let jetDisplayScene, jetDisplayCamera, jetDisplayRenderer, jetModel;
let jetDisplayActive = false;

// Game settings
const SPEED_INCREMENT = 0.5;
const MAX_SPEED = 200;
const BOOST_MULTIPLIER = 2;

// Initialize the game
async function init() {
    // Initialize jet display first
    initJetDisplay();

    // Create main game scene
    scene = new THREE.Scene();

    // Create camera with closer initial position for more immersive view
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 200, 50); // Closer initial position

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87ceeb, 0.3);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    const gameContainer = document.getElementById('gameContainer');
    gameContainer.appendChild(renderer.domElement);

    // Create and initialize environment
    environment = new Environment(scene);
    await environment.init();

    // Create and initialize invisible debug grid system
    debugGrid = new DebugGrid(scene, 16000); // 4x world size
    debugGrid.createGrid();

    // Create aircraft system
    aircraftSystem = new AircraftSystem(scene, environment);
    await aircraftSystem.init();

    // Initialize crash effects system
    console.log('Loading crash effects...');
    crashEffects = new CrashEffects(scene);
    await crashEffects.init();
    
    // Make crash effects globally accessible for aircraft system
    window.crashEffects = crashEffects;
    console.log('Crash effects system initialized');

    // Initialize camera system
    cameraSystem = new CameraSystem(camera, scene, environment);
    
    // Make camera system globally accessible for aircraft system
    window.cameraSystem = cameraSystem;
    console.log('Camera system initialized');

    // Initialize controls
    controls = new AircraftControls();
    console.log('Controls system initialized');

    // Setup event listeners
    setupEventListeners();

    // Setup UI
    setupUI();

    // Start render loop (but don't start game logic yet)
    animate();
}

function setupEventListeners() {
    // Start button
    document.getElementById('startButton').addEventListener('click', startGame);

    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function setupUI() {
    // Initially hide the game UI
    const ui = document.getElementById('ui');
    ui.classList.remove('visible');
}

function startGame() {
    console.log('Starting game...');
    gameStarted = true;
    
    // Stop jet display animation
    stopJetDisplay();
    
    // Hide start screen
    document.getElementById('startScreen').classList.add('hidden');
    
    // Show game UI
    document.getElementById('ui').classList.add('visible');
    
    console.log('Game started, animate loop will handle updates');
}

function gameLoop() {
    frameCount++;
    
    if (!gameStarted || !aircraftSystem || !controls) {
        if (frameCount % 60 === 0) { // Log every second
            console.log('Game loop early return:', { gameStarted, aircraftSystem: !!aircraftSystem, controls: !!controls });
        }
        return;
    }

    // Log every 60 frames (once per second at 60fps)
    if (frameCount % 60 === 0) {
        console.log('Game loop running, frame:', frameCount);
    }

    // Get input from controls system
    const input = controls.getInputState();
    
    // Handle reset input
    if (input.reset && aircraftSystem) {
        console.log('Reset requested by user');
        aircraftSystem.reset();
        // Reset camera system to follow mode
        if (cameraSystem) {
            cameraSystem.setFollowMode();
        }
        // Reset score when aircraft is reset
        score = 0;
        // Clear any active crash effects
        if (crashEffects && crashEffects.isCrashActive()) {
            crashEffects.stopCrashEffects();
        }
    }
    
    // Debug: Log input if any keys are pressed
    if (controls.hasInput()) {
        console.log('Active input detected:', input);
        console.log('Pressed keys:', controls.getPressedKeys());
    }
    
    // Update aircraft system
    const deltaTime = 1/60; // Assuming 60 FPS
    aircraftSystem.update(deltaTime, input);
    
    // Update crash effects
    if (crashEffects) {
        crashEffects.update(deltaTime);
    }
    
    // Update camera system
    if (cameraSystem && aircraftSystem.aircraft) {
        cameraSystem.update(deltaTime, aircraftSystem.aircraft);
    }
    
    // Update UI with aircraft metrics
    updateUI();
}

// OLD CAMERA FUNCTION - REPLACED BY CAMERA SYSTEM
// function updateCamera() {
//     ... (commented out - using CameraSystem now)
// }

// Debug helper - add this to console for testing camera positions
window.cameraDebug = {
    // Test different camera positions
    setBehind: () => {
        if (aircraftSystem && aircraftSystem.aircraft) {
            const aircraft = aircraftSystem.aircraft;
            const offset = new THREE.Vector3(0, 5, 15);
            offset.applyQuaternion(aircraft.quaternion);
            camera.position.copy(aircraft.position.clone().add(offset));
            camera.lookAt(aircraft.position);
            console.log('Camera set to behind (+Z)');
        }
    },
    setFront: () => {
        if (aircraftSystem && aircraftSystem.aircraft) {
            const aircraft = aircraftSystem.aircraft;
            const offset = new THREE.Vector3(0, 5, -15);
            offset.applyQuaternion(aircraft.quaternion);
            camera.position.copy(aircraft.position.clone().add(offset));
            camera.lookAt(aircraft.position);
            console.log('Camera set to front (-Z)');
        }
    },
    setLeft: () => {
        if (aircraftSystem && aircraftSystem.aircraft) {
            const aircraft = aircraftSystem.aircraft;
            const offset = new THREE.Vector3(-15, 5, 0);
            offset.applyQuaternion(aircraft.quaternion);
            camera.position.copy(aircraft.position.clone().add(offset));
            camera.lookAt(aircraft.position);
            console.log('Camera set to left (-X)');
        }
    },
    setRight: () => {
        if (aircraftSystem && aircraftSystem.aircraft) {
            const aircraft = aircraftSystem.aircraft;
            const offset = new THREE.Vector3(15, 5, 0);
            offset.applyQuaternion(aircraft.quaternion);
            camera.position.copy(aircraft.position.clone().add(offset));
            camera.lookAt(aircraft.position);
            console.log('Camera set to right (+X)');
        }
    }
};

console.log('Camera debug available: cameraDebug.setBehind(), cameraDebug.setFront(), cameraDebug.setLeft(), cameraDebug.setRight()');

// Debug controls system with proper encapsulation
window.controlsDebug = {
    testInput: () => {
        if (controls) {
            const input = controls.getInputState();
            console.log('Current control input:', input);
            console.log('Pressed keys:', controls.getPressedKeys());
            console.log('Has input:', controls.hasInput());
            return input;
        } else {
            console.log('Controls not initialized');
        }
    },
    forceThrust: () => {
        if (aircraftSystem) {
            const testInput = { throttle: 1.0, pitch: 0, yaw: 0, roll: 0 };
            aircraftSystem.update(1/60, testInput);
            console.log('Forced thrust input');
        }
    },
    getAircraftStatus: () => {
        if (aircraftSystem) {
            const metrics = aircraftSystem.getMetrics();
            console.log('Aircraft status:', metrics);
            console.log('Aircraft position:', aircraftSystem.aircraft?.position);
            console.log('Aircraft velocity:', aircraftSystem.velocity);
        }
    },
    enableDebug: () => {
        if (controls) {
            controls.setDebug(true);
            console.log('Controls debug enabled');
        }
    },
    disableDebug: () => {
        if (controls) {
            controls.setDebug(false);
            console.log('Controls debug disabled');
        }
    }
};

console.log('Controls debug available: controlsDebug.testInput(), controlsDebug.forceThrust(), controlsDebug.getAircraftStatus(), controlsDebug.enableDebug(), controlsDebug.disableDebug()');

// Quick test function to verify everything is connected
window.quickTest = function() {
    console.log('=== QUICK TEST ===');
    console.log('Game started:', gameStarted);
    console.log('Aircraft system:', !!aircraftSystem);
    console.log('Controls system:', !!controls);
    console.log('Frame count:', frameCount);
    
    if (controls) {
        console.log('Testing controls...');
        const input = controls.getInputState();
        console.log('Current input:', input);
        
        // FIXED: Use proper encapsulation methods
        controls.simulateKeyPress('KeyW');
        const inputWithW = controls.getInputState();
        console.log('Input with W pressed:', inputWithW);
        controls.simulateKeyRelease('KeyW');
    }
    
    if (aircraftSystem) {
        console.log('Aircraft position:', aircraftSystem.aircraft?.position);
        console.log('Aircraft velocity:', aircraftSystem.velocity);
        
        // Give aircraft some initial forward velocity to help with testing
        aircraftSystem.velocity.set(0, 0, -10); // Forward velocity
        console.log('Set initial forward velocity');
    }
    
    console.log('=== END TEST ===');
};

// Test function to give aircraft initial velocity
window.giveAircraftVelocity = function(x = 0, y = 2, z = -15) {
    if (aircraftSystem) {
        aircraftSystem.velocity.set(x, y, z);
        console.log('Aircraft velocity set to:', x, y, z);
    }
};

// Test different forward directions to fix movement
window.testForwardDirections = function() {
    if (!aircraftSystem || !aircraftSystem.aircraft) {
        console.log('Aircraft not available');
        return;
    }
    
    console.log('Testing different forward directions...');
    console.log('Current aircraft rotation:', aircraftSystem.aircraft.rotation);
    
    // Test different forward vectors
    const directions = [
        { name: 'Forward -Z', vector: new THREE.Vector3(0, 0, -1) },
        { name: 'Forward +Z', vector: new THREE.Vector3(0, 0, 1) },
        { name: 'Forward -X', vector: new THREE.Vector3(-1, 0, 0) },
        { name: 'Forward +X', vector: new THREE.Vector3(1, 0, 0) }
    ];
    
    directions.forEach(dir => {
        const worldDirection = dir.vector.clone();
        worldDirection.applyQuaternion(aircraftSystem.aircraft.quaternion);
        console.log(`${dir.name}: local ${dir.vector.x}, ${dir.vector.y}, ${dir.vector.z} -> world ${worldDirection.x.toFixed(2)}, ${worldDirection.y.toFixed(2)}, ${worldDirection.z.toFixed(2)}`);
    });
};

// Banking mechanics explanation and test
window.bankingTutorial = function() {
    console.log('🛩️ REALISTIC BANKING TUTORIAL:');
    console.log('1. Use A/D to BANK (roll) the aircraft');
    console.log('2. Banking creates TURNING FORCE (just like real planes!)');
    console.log('3. Use rudder (A/D + Shift) for COORDINATED TURNS');
    console.log('4. Too much banking reduces LIFT (realistic!)');
    console.log('5. Watch G-FORCE - high G can cause problems');
    console.log('6. Stall speed: Below 50 km/h = loss of control');
    console.log('7. Banking + Speed = Beautiful coordinated turns');
    console.log('');
    console.log('Try: W for power + A to bank left + gentle rudder');
};

window.flightTest = function() {
    if (!aircraftSystem) return;
    
    const metrics = aircraftSystem.getMetrics();
    console.log('📊 FLIGHT DATA:');
    console.log(`Speed: ${metrics.speed} km/h`);
    console.log(`Bank Angle: ${metrics.bankAngle}°`);
    console.log(`G-Force: ${metrics.gForce}`);
    console.log(`Turn Rate: ${metrics.turnRate}°/sec`);
    console.log(`Stall Warning: ${metrics.stallWarning ? 'YES' : 'NO'}`);
    console.log(`Velocity: ${aircraftSystem.velocity.x.toFixed(1)}, ${aircraftSystem.velocity.y.toFixed(1)}, ${aircraftSystem.velocity.z.toFixed(1)}`);
};

// Crash Effects Debug Functions
window.crashDebug = {
    testCrash: () => {
        if (aircraftSystem && window.crashEffects) {
            const pos = aircraftSystem.aircraft.position.clone();
            window.crashEffects.triggerAircraftCrash(pos, 50); // Medium severity
            console.log('🔥 Test crash triggered at aircraft position');
        } else {
            console.log('❌ Aircraft system or crash effects not available');
        }
    },
    testBigCrash: () => {
        if (aircraftSystem && window.crashEffects) {
            const pos = aircraftSystem.aircraft.position.clone();
            window.crashEffects.triggerAircraftCrash(pos, 150); // High severity
            console.log('💥 Big crash triggered at aircraft position');
        } else {
            console.log('❌ Aircraft system or crash effects not available');
        }
    },
    forceCrash: () => {
        if (aircraftSystem) {
            aircraftSystem.handleCrash();
            console.log('⚠️ Forced aircraft crash');
        } else {
            console.log('❌ Aircraft system not available');
        }
    },
    checkSmokeTexture: () => {
        if (window.crashEffects && window.crashEffects.smokeTexture) {
            console.log('✅ Smoke texture loaded successfully');
            console.log('Texture size:', window.crashEffects.smokeTexture.image.width, 'x', window.crashEffects.smokeTexture.image.height);
        } else {
            console.log('❌ Smoke texture not loaded');
        }
    }
};

console.log('💥 Crash debug functions available:');
console.log('  crashDebug.testCrash() - Test medium crash');
console.log('  crashDebug.testBigCrash() - Test severe crash');
console.log('  crashDebug.forceCrash() - Force aircraft to crash');
console.log('  crashDebug.checkSmokeTexture() - Check if smoke texture is loaded');

function updateUI() {
    if (!aircraftSystem) return;
    
    const metrics = aircraftSystem.getMetrics();
    
    // Update camera status
    if (cameraSystem) {
        const cameraInfo = cameraSystem.getCameraInfo();
        const cameraElement = document.getElementById('cameraMode');
        
        switch(cameraInfo.mode) {
            case 'follow':
                cameraElement.textContent = '📹 Follow Cam';
                cameraElement.style.color = '#88ff88';
                break;
            case 'crash':
                cameraElement.textContent = '🎬 Crash Cam';
                cameraElement.style.color = '#ff8888';
                break;
            case 'cinematic':
                cameraElement.textContent = '🎥 Cinematic';
                cameraElement.style.color = '#ffff88';
                break;
        }
    }
    
    document.getElementById('speed').textContent = `Speed: ${metrics.speed} km/h`;
    document.getElementById('altitude').textContent = `Altitude: ${metrics.altitude} m`;
    document.getElementById('score').textContent = `Score: ${Math.round(score)}`;
    document.getElementById('bankAngle').textContent = `Bank: ${metrics.bankAngle}°`;
    document.getElementById('gForce').textContent = `G-Force: ${metrics.gForce}`;
    
    // Show stall warning
    const stallWarning = document.getElementById('stallWarning');
    const crashWarning = document.getElementById('crashWarning');
    
    if (metrics.crashed) {
        // Hide stall warning when crashed
        stallWarning.style.display = 'none';
        // Show crash warning
        crashWarning.style.display = 'block';
        
        // Display crash status in the UI
        document.getElementById('speed').textContent = `Speed: CRASHED`;
        document.getElementById('altitude').textContent = `Status: AIRCRAFT DOWN`;
        document.getElementById('bankAngle').textContent = `Bank: --`;
        document.getElementById('gForce').textContent = `G-Force: --`;
        
        // Stop score accumulation when crashed
        console.log('Aircraft crashed - all movement halted. Press R to reset.');
    } else {
        // Hide crash warning when not crashed
        crashWarning.style.display = 'none';
        
        // Show stall warning only when not crashed
        if (metrics.stallWarning) {
            stallWarning.style.display = 'block';
        } else {
            stallWarning.style.display = 'none';
        }
        
        // Update score based on speed and banking performance (only when not crashed)
        if (metrics.speed > 0) {
            score += metrics.speed * 0.001;
            
            // Bonus points for coordinated turns (banking without excessive G-force)
            if (Math.abs(metrics.bankAngle) > 15 && metrics.gForce < 2.5) {
                score += Math.abs(metrics.bankAngle) * 0.01; // Banking bonus
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameStarted) {
        gameLoop();
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Also resize jet display
    resizeJetDisplay();
}

// Initialize 3D jet display for start screen
function initJetDisplay() {
    const canvas = document.getElementById('jetCanvas');
    const loadingElement = document.getElementById('jetLoading');
    
    // Create separate scene for jet display
    jetDisplayScene = new THREE.Scene();
    // No background - transparent
    jetDisplayScene.background = null;
    
    // Create camera for jet display
    jetDisplayCamera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    jetDisplayCamera.position.set(0, 1, 12);
    jetDisplayCamera.lookAt(0, 0, 0);
    
    // Create renderer for jet display
    jetDisplayRenderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: true, 
        alpha: true // Enable transparency
    });
    jetDisplayRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    jetDisplayRenderer.setClearColor(0x000000, 0); // Fully transparent background
    jetDisplayRenderer.shadowMap.enabled = true;
    jetDisplayRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Simple lighting for proper color visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    jetDisplayScene.add(ambientLight);
    
    // Main spotlight from front-right
    const keyLight = new THREE.SpotLight(0xffffff, 1.5);
    keyLight.position.set(8, 8, 8);
    keyLight.angle = Math.PI / 3;
    keyLight.penumbra = 0.3;
    keyLight.decay = 2;
    keyLight.distance = 25;
    keyLight.castShadow = true;
    keyLight.target.position.set(0, 0, 0);
    jetDisplayScene.add(keyLight);
    jetDisplayScene.add(keyLight.target);
    
    // Fill light from left
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 3, 5);
    jetDisplayScene.add(fillLight);
    
    // Rim light from behind
    const rimLight = new THREE.DirectionalLight(0x9ccfff, 0.3);
    rimLight.position.set(0, 2, -8);
    jetDisplayScene.add(rimLight);
    
    // Load GLB model
    loadJetModel(loadingElement);
    
    jetDisplayActive = true;
    animateJetDisplay();
}

function loadJetModel(loadingElement) {
    const loader = new GLTFLoader();
    
    // Try to load the GLB file
    loader.load(
        './visuals/airManiaJet.glb', // Using the actual GLB file
        function(gltf) {
            jetModel = gltf.scene;
            
            // Much smaller scale to see the entire plane clearly
            jetModel.scale.set(0.8, 0.8, 0.8); // Much smaller - from 2 to 0.8
            jetModel.position.set(0, 0, 0); // Centered
            
            // Enable shadows and preserve original colors
            jetModel.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Preserve original colors
                    if (child.material) {
                        child.material.metalness = 0.3;
                        child.material.roughness = 0.7;
                        child.material.envMapIntensity = 0.5;
                    }
                }
            });
            
            jetDisplayScene.add(jetModel);
            
            // Immediately hide loading indicator and prevent it from showing again
            loadingElement.style.display = 'none';
            
            console.log('Modern jet loaded successfully!');
        },
        function(progress) {
            const percentage = Math.round((progress.loaded / progress.total * 100));
            console.log('Loading progress:', percentage + '%');
            
            // Update loading text with progress
            const loadingText = loadingElement.querySelector('div:last-child');
            if (loadingText) {
                loadingText.textContent = `Loading Modern Jet... ${percentage}%`;
            }
        },
        function(error) {
            console.log('Error loading jet model:', error);
            // Fallback: create a simple jet representation
            createFallbackJet(loadingElement);
        }
    );
}

function createFallbackJet(loadingElement) {
    console.log('Creating fallback jet model...');
    
    const jetGroup = new THREE.Group();
    
    // Modern fuselage (smaller scale)
    const fuselageGeometry = new THREE.CylinderGeometry(0.1, 0.2, 2, 12);
    const fuselageMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0x1976d2,
        metalness: 0.3,
        roughness: 0.7
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.castShadow = true;
    jetGroup.add(fuselage);
    
    // Delta wings (smaller)
    const wingGeometry = new THREE.ConeGeometry(1, 2.5, 3);
    const wingMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0x42a5f5,
        metalness: 0.3,
        roughness: 0.7
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.rotation.x = Math.PI / 2;
    wings.rotation.z = Math.PI / 2;
    wings.position.z = -0.3;
    wings.castShadow = true;
    jetGroup.add(wings);
    
    // Cockpit (smaller)
    const cockpitGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    const cockpitMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0x263238,
        metalness: 0.5,
        roughness: 0.5
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.x = 0.8;
    cockpit.position.y = 0.1;
    cockpit.castShadow = true;
    jetGroup.add(cockpit);
    
    // Scale the entire group to match the GLB scale
    jetGroup.scale.set(0.8, 0.8, 0.8);
    
    jetModel = jetGroup;
    jetDisplayScene.add(jetModel);
    
    // Hide loading indicator
    loadingElement.style.display = 'none';
}

function animateJetDisplay() {
    if (!jetDisplayActive) return;
    
    requestAnimationFrame(animateJetDisplay);
    
    // Simple plane rotation
    if (jetModel) {
        const time = Date.now() * 0.001;
        
        // Smooth Y-axis rotation 
        jetModel.rotation.y += 0.01;
        
        // Very subtle floating motion
        jetModel.position.y = Math.sin(time * 0.8) * 0.05;
        
        // Minimal banking
        jetModel.rotation.z = Math.sin(time * 0.6) * 0.02; 
        jetModel.rotation.x = Math.sin(time * 0.4) * 0.01; 
    }
    
    // Render the jet display
    if (jetDisplayRenderer && jetDisplayScene && jetDisplayCamera) {
        jetDisplayRenderer.render(jetDisplayScene, jetDisplayCamera);
    }
}

function stopJetDisplay() {
    jetDisplayActive = false;
}

// Handle window resize for jet display
function resizeJetDisplay() {
    if (jetDisplayRenderer && jetDisplayCamera) {
        const canvas = document.getElementById('jetCanvas');
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        jetDisplayCamera.aspect = width / height;
        jetDisplayCamera.updateProjectionMatrix();
        jetDisplayRenderer.setSize(width, height);
    }
}

// Initialize the game when the script loads
init();

// Function to add noise to terrain if heightmap is too flat
window.addTerrainNoise = function(intensity = 0.5) {
    if (environment) {
        environment.addNoiseToTerrain(intensity);
    }
};

// Function to test different noise levels
window.testNoiseLevel = function(level) {
    console.log(`Testing noise level: ${level}`);
    window.addTerrainNoise(level);
};

// Function to enhance jagged peaks
window.enhanceJaggedPeaks = function(intensity = 1.5) {
    if (environment) {
        environment.enhanceJaggedPeaks(intensity);
    }
};

// Function to adjust valley intensity
window.adjustValleys = function(intensity = 1.0) {
    if (environment) {
        environment.adjustValleyIntensity(intensity);
    }
};

// Function to show terrain info
window.showTerrainInfo = function() {
    console.log('Terrain Commands:');
    console.log('- addTerrainNoise(0.5) - Add procedural noise');
    console.log('- enhanceJaggedPeaks(1.5) - Make peaks more jagged');
    console.log('- adjustValleys(1.0) - Adjust valley depth');
    console.log('- testNoiseLevel(0.8) - Test specific noise level');
};
