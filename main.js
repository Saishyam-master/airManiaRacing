import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Environment } from './environment.js';

// Game state
let scene, camera, renderer, aircraft;
let gameStarted = false;
let keys = {};
let speed = 0;
let altitude = 500; // Increased from 100 to be safely above terrain
let score = 0;
let environment;

// Jet display state
let jetDisplayScene, jetDisplayCamera, jetDisplayRenderer, jetModel;
let jetDisplayActive = false;

// Game settings
const SPEED_INCREMENT = 0.5;
const MAX_SPEED = 200;
const BOOST_MULTIPLIER = 2;

/**
 * Initializes the game, setting up the 3D scene, camera, renderer, environment, aircraft, UI, and event listeners.
 * 
 * This function prepares all core components and starts the rendering loop, but does not begin gameplay until the user starts the game.
 */
async function init() {
    // Initialize jet display first
    initJetDisplay();

    // Create main game scene
    scene = new THREE.Scene();

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.set(0, 400, 100); // Raised camera position for higher terrain

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

    // Create aircraft
    createAircraft();

    // Setup event listeners
    setupEventListeners();

    // Setup UI
    setupUI();

    // Start render loop (but don't start game logic yet)
    animate();
}

/**
 * Creates and adds the player's aircraft model to the scene at the environment's spawn position.
 *
 * The aircraft is constructed from basic geometries representing the fuselage, wings, tail, and propeller.
 * It is positioned at the environment's designated spawn point, or at a default safe altitude if unavailable.
 * Updates the global `aircraft` reference and sets the initial altitude.
 */
function createAircraft() {
    const aircraftGroup = new THREE.Group();

    // Fuselage (main body)
    const fuselageGeometry = new THREE.CylinderGeometry(2, 4, 20, 8);
    const fuselageMaterial = new THREE.MeshLambertMaterial({ color: 0x1976d2 });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.castShadow = true;
    aircraftGroup.add(fuselage);

    // Wings
    const wingGeometry = new THREE.BoxGeometry(30, 1, 8);
    const wingMaterial = new THREE.MeshLambertMaterial({ color: 0x42a5f5 });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.z = -2;
    wings.castShadow = true;
    aircraftGroup.add(wings);

    // Tail
    const tailGeometry = new THREE.BoxGeometry(8, 8, 1);
    const tailMaterial = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.x = -12;
    tail.castShadow = true;
    aircraftGroup.add(tail);

    // Propeller
    const propGeometry = new THREE.BoxGeometry(0.5, 12, 0.5);
    const propMaterial = new THREE.MeshLambertMaterial({ color: 0x616161 });
    const propeller = new THREE.Mesh(propGeometry, propMaterial);
    propeller.position.x = 12;
    propeller.name = 'propeller';
    aircraftGroup.add(propeller);

    // Use environment spawn position if available, otherwise use safe altitude
    const spawnPosition = environment ? environment.getSpawnPosition() : new THREE.Vector3(0, 500, 0);
    aircraftGroup.position.copy(spawnPosition);
    altitude = spawnPosition.y;
    
    console.log(`Aircraft spawned at position: (${spawnPosition.x.toFixed(2)}, ${spawnPosition.y.toFixed(2)}, ${spawnPosition.z.toFixed(2)})`);
    
    aircraft = aircraftGroup;
    scene.add(aircraft);
}

/**
 * Sets up event listeners for keyboard input, start button clicks, and window resizing.
 * 
 * Tracks pressed keys for game controls, starts the game when the start button is clicked, and adjusts rendering on window resize.
 */
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
    if (!gameStarted) return;

    // Handle input
    handleInput();
    
    // Update game state
    updateGameState();
    
    // Update UI
    updateUI();
}

/**
 * Processes user input to control the aircraft's speed, orientation, and movement.
 *
 * Adjusts speed and applies a boost if the spacebar is held, modifies pitch, yaw, and roll based on WASD keys, moves the aircraft forward, and enforces a minimum altitude above the terrain.
 */
function handleInput() {
    const isBoosting = keys['Space'];
    const currentMaxSpeed = isBoosting ? MAX_SPEED * BOOST_MULTIPLIER : MAX_SPEED;
    
    // Forward/Backward
    if (keys['KeyW']) {
        speed = Math.min(speed + SPEED_INCREMENT, currentMaxSpeed);
        aircraft.rotation.x = Math.max(aircraft.rotation.x - 0.01, -0.3);
    } else if (keys['KeyS']) {
        speed = Math.max(speed - SPEED_INCREMENT, 0);
        aircraft.rotation.x = Math.min(aircraft.rotation.x + 0.01, 0.2);
    } else {
        // Gradually return to level flight
        aircraft.rotation.x *= 0.98;
    }
    
    // Left/Right
    if (keys['KeyA']) {
        aircraft.rotation.y += 0.02;
        aircraft.rotation.z = Math.min(aircraft.rotation.z + 0.02, 0.5);
    } else if (keys['KeyD']) {
        aircraft.rotation.y -= 0.02;
        aircraft.rotation.z = Math.max(aircraft.rotation.z - 0.02, -0.5);
    } else {
        // Gradually level the aircraft
        aircraft.rotation.z *= 0.95;
    }
    
    // Move aircraft forward
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(aircraft.quaternion);
    aircraft.position.add(direction.multiplyScalar(speed * 0.1));
    
    // Keep aircraft above ground - minimum altitude for new terrain
    altitude = Math.max(aircraft.position.y, 50);
    aircraft.position.y = altitude;
}

function updateGameState() {
    // Rotate propeller
    const propeller = aircraft.getObjectByName('propeller');
    if (propeller) {
        propeller.rotation.z += speed * 0.1;
    }
    
    // Update camera to follow aircraft
    const idealCameraPosition = new THREE.Vector3(0, 50, 100);
    idealCameraPosition.applyQuaternion(aircraft.quaternion);
    idealCameraPosition.add(aircraft.position);
    
    camera.position.lerp(idealCameraPosition, 0.1);
    camera.lookAt(aircraft.position);
    
    // Update score based on speed and time
    if (speed > 0) {
        score += speed * 0.01;
    }
}

function updateUI() {
    document.getElementById('speed').textContent = `Speed: ${Math.round(speed)} km/h`;
    document.getElementById('altitude').textContent = `Altitude: ${Math.round(altitude)} m`;
    document.getElementById('score').textContent = `Score: ${Math.round(score)}`;
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
