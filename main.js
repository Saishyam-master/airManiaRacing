import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Environment } from './environment.js'; // Using clean environment (renamed)
import { AircraftSystem } from './aircraft-system.js';
import { AircraftControls } from './controls.js';
import { DebugGrid } from './grid.js';
import { RaceTrack } from './racetrack.js';

// Racing system imports
if (typeof window !== 'undefined') {
    // Browser environment - load via script tags or module system
    const script1 = document.createElement('script');
    script1.src = './race-manager.js';
    document.head.appendChild(script1);
    
    const script2 = document.createElement('script');
    script2.src = './ui.js';
    document.head.appendChild(script2);
}

// Game state
let scene, camera, renderer, aircraftSystem, debugGrid;
let gameStarted = false;
let controls; // New controls system
let speed = 0;
let altitude = 500;
let score = 0;
let environment;
let frameCount = 0;
let raceTrack; // Racing track system

// Racing system
let raceManager = null;
let racingUI = null;

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

    // Create and initialize race track
    raceTrack = new RaceTrack(scene, environment);
    await raceTrack.init();
    console.log('Race track system initialized');

    // Initialize controls
    controls = new AircraftControls();
    console.log('Controls system initialized');

    // Initialize racing system (wait for scripts to load)
    setTimeout(() => {
        if (window.RaceManager && window.racingUI) {
            raceManager = new window.RaceManager(scene, aircraftSystem);
            racingUI = window.racingUI;
            racingUI.setRaceManager(raceManager);
            racingUI.setAircraftSystem(aircraftSystem);
            console.log('Racing system initialized');
        } else {
            console.warn('Racing system not loaded yet, trying again...');
            setTimeout(() => {
                if (window.RaceManager && window.racingUI) {
                    raceManager = new window.RaceManager(scene, aircraftSystem);
                    racingUI = window.racingUI;
                    racingUI.setRaceManager(raceManager);
                    racingUI.setAircraftSystem(aircraftSystem);
                    console.log('Racing system initialized (delayed)');
                }
            }, 1000);
        }
    }, 500);

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
    
    // Show racing UI
    if (racingUI) {
        racingUI.show();
    }
    
    // Start race after 3 seconds
    setTimeout(() => {
        if (raceManager) {
            raceManager.startRace();
            console.log('Race started!');
        }
    }, 3000);
    
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
    
    // Handle reset input first (works even when crashed)
    if (input.reset && aircraftSystem) {
        console.log('Reset requested by user');
        aircraftSystem.reset();
        
        // Reset racing state if needed
        if (raceManager && !raceManager.isRacing) {
            // Could restart race here if desired
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
    
    // Update race track system
    if (raceTrack && aircraftSystem.aircraft) {
        raceTrack.update(deltaTime, aircraftSystem.aircraft.position);
    }
    
    // Update racing system
    if (raceManager) {
        raceManager.update();
    }
    
    // Update camera
    updateCamera();
    
    // Update UI with aircraft metrics
    updateUI();
    
    // Update racing UI
    if (racingUI) {
        racingUI.update();
    }
}

function updateCamera() {
    if (!aircraftSystem || !aircraftSystem.aircraft) return;
    
    const aircraft = aircraftSystem.aircraft;
    
    // Try positioning camera behind aircraft in different ways
    // The GLB model might be oriented differently than expected
    
    // Method 1: Try all possible "behind" positions
    const possibleOffsets = [
        new THREE.Vector3(0, 3, 10),   // Behind (+Z)
        new THREE.Vector3(0, 3, -10),  // Front (-Z)
        new THREE.Vector3(10, 3, 0),   // Right (+X)
        new THREE.Vector3(-10, 3, 0),  // Left (-X)
    ];
    
    // For now, let's try behind (+Z) and if it looks wrong, we'll try others
    const cameraOffset = new THREE.Vector3(0, 4, 12); // Behind and slightly above
    cameraOffset.applyQuaternion(aircraft.quaternion);
    
    const idealCameraPosition = aircraft.position.clone().add(cameraOffset);
    
    // Smooth camera movement
    camera.position.lerp(idealCameraPosition, 0.08);
    
    // Look slightly ahead of the aircraft
    const lookAhead = new THREE.Vector3(0, 0, -5); // Look forward
    lookAhead.applyQuaternion(aircraft.quaternion);
    const lookTarget = aircraft.position.clone().add(lookAhead);
    
    camera.lookAt(lookTarget);
    
    // Debug: Log camera and aircraft positions occasionally
    if (Math.random() < 0.01) { // 1% chance to log
        console.log('Aircraft pos:', aircraft.position);
        console.log('Camera pos:', camera.position);
        console.log('Aircraft rotation:', aircraft.rotation);
    }
}

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

function updateUI() {
    if (!aircraftSystem) return;
    
    const metrics = aircraftSystem.getMetrics();
    
    document.getElementById('speed').textContent = `Speed: ${metrics.speed} km/h`;
    document.getElementById('altitude').textContent = `Altitude: ${metrics.altitude} m`;
    document.getElementById('score').textContent = `Score: ${Math.round(score)}`;
    document.getElementById('bankAngle').textContent = `Bank: ${metrics.bankAngle}°`;
    document.getElementById('gForce').textContent = `G-Force: ${metrics.gForce}`;
    
    // Add race track information
    if (raceTrack) {
        const raceData = raceTrack.getRaceData();
        document.getElementById('currentGate').textContent = `Gate: ${raceData.currentGate}/${raceData.totalGates}`;
        
        if (raceData.raceStarted) {
            document.getElementById('lapTime').textContent = `Lap: ${raceData.currentLapTime.toFixed(1)}s`;
            if (raceData.bestLapTime) {
                document.getElementById('bestLap').textContent = `Best: ${raceData.bestLapTime.toFixed(1)}s`;
            }
        }
    }
    
    // Show stall warning
    const stallWarning = document.getElementById('stallWarning');
    if (metrics.stallWarning) {
        stallWarning.style.display = 'block';
    } else {
        stallWarning.style.display = 'none';
    }
    
    // Update score based on speed and banking performance
    if (metrics.speed > 0) {
        score += metrics.speed * 0.001;
        
        // Bonus points for coordinated turns (banking without excessive G-force)
        if (Math.abs(metrics.bankAngle) > 15 && metrics.gForce < 2.5) {
            score += Math.abs(metrics.bankAngle) * 0.01; // Banking bonus
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
