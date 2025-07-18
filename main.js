import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Environment } from './environment.js';
import { AircraftSystem } from './aircraft-system.js';

// Game state
let scene, camera, renderer, aircraftSystem;
let gameStarted = false;
let keys = {};
let speed = 0;
let altitude = 500;
let score = 0;
let environment;

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

    // Create aircraft system
    aircraftSystem = new AircraftSystem(scene, environment);
    await aircraftSystem.init();

    // Setup event listeners
    setupEventListeners();

    // Setup UI
    setupUI();

    // Start render loop (but don't start game logic yet)
    animate();
}

function setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
    });

    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

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
    gameStarted = true;
    
    // Stop jet display animation
    stopJetDisplay();
    
    // Hide start screen
    document.getElementById('startScreen').classList.add('hidden');
    
    // Show game UI
    document.getElementById('ui').classList.add('visible');
    
    // Start game loop
    gameLoop();
}

function gameLoop() {
    if (!gameStarted || !aircraftSystem) return;

    // Get input for aircraft
    const input = getInputState();
    
    // Update aircraft system
    const deltaTime = 1/60; // Assuming 60 FPS
    aircraftSystem.update(deltaTime, input);
    
    // Update camera
    updateCamera();
    
    // Update UI with aircraft metrics
    updateUI();
}

function getInputState() {
    const isBoosting = keys['Space'];
    const boostMultiplier = isBoosting ? 1.5 : 1.0;
    
    return {
        throttle: keys['KeyW'] ? 1.0 * boostMultiplier : (keys['KeyS'] ? -0.5 : 0),
        pitch: keys['KeyW'] ? -0.5 : (keys['KeyS'] ? 0.5 : 0),
        yaw: keys['KeyA'] ? -1.0 : (keys['KeyD'] ? 1.0 : 0),
        roll: keys['KeyA'] ? 0.5 : (keys['KeyD'] ? -0.5 : 0)
    };
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

function updateUI() {
    if (!aircraftSystem) return;
    
    const metrics = aircraftSystem.getMetrics();
    
    document.getElementById('speed').textContent = `Speed: ${metrics.speed} km/h`;
    document.getElementById('altitude').textContent = `Altitude: ${metrics.altitude} m`;
    document.getElementById('score').textContent = `Score: ${Math.round(score)}`;
    
    // Update score based on speed and time
    if (metrics.speed > 0) {
        score += metrics.speed * 0.001;
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
