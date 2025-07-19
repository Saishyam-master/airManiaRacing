import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

export class Environment {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.terrain = null;
        this.terrainSize = config.terrainSize || 16000; // 4x bigger world (was 4000)
        this.heightScale = config.heightScale || 400;
        this.terrainSegments = config.terrainSegments || 128;
        this.spawnHeight = config.spawnHeight || 200;
        
        // Asset paths configuration
        this.assetPaths = {
            heightmap: config.heightmapPath || 'assets/Rocky Land and Rivers/Height Map PNG.png',
            diffuse: config.diffusePath || 'assets/Rocky Land and Rivers/Diffuse.exr',
            bumpMap: config.bumpMapPath || 'assets/Rocky Land and Rivers/Bump Map for Material.exr'
        };
    }

    async init() {
        try {
            console.log('Starting environment initialization...');
            await this.createTerrain();
            this.createLighting();
            this.createSkybox();
            console.log('Environment initialized successfully');
        } catch (error) {
            console.error('Error initializing environment:', error);
        }
    }

    async createTerrain() {
        // Create simple terrain geometry
        const geometry = new THREE.PlaneGeometry(
            this.terrainSize, 
            this.terrainSize, 
            this.terrainSegments, 
            this.terrainSegments
        );
        
        // Add simple height variation for now
        this.addSimpleHeights(geometry);
        
        // Create basic material
        const material = new THREE.MeshStandardMaterial({
            color: 0x567d46,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create terrain mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.position.y = 0;
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = true;
        
        this.scene.add(this.terrain);
        console.log('Basic terrain created successfully');
        
        // Make terrain methods available for debugging
        window.terrainDebug = {
            getHeight: (x, z) => this.getTerrainHeightAt(x, z),
            info: () => this.logTerrainInfo(),
            spawn: () => this.getSpawnPosition(),
            cornerSpawn: () => this.getCornerSpawnPosition()
        };
    }

    addSimpleHeights(geometry) {
        const vertices = geometry.attributes.position.array;
        
        // Add simple rolling hills
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            
            // Simple height variation
            let height = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 50;
            height += Math.sin(x * 0.005) * Math.cos(y * 0.005) * 100;
            
            vertices[i + 2] = height;
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    createLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(1000, 1000, 500);
        directionalLight.castShadow = true;

        // Configure shadows - 4x bigger world
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 8000; // 4x bigger (was 2000)
        directionalLight.shadow.camera.left = -4000; // 4x bigger (was -1000)
        directionalLight.shadow.camera.right = 4000; // 4x bigger (was 1000)
        directionalLight.shadow.camera.top = 4000; // 4x bigger (was 1000)
        directionalLight.shadow.camera.bottom = -4000; // 4x bigger (was -1000)

        this.scene.add(directionalLight);

        // Add some fog - 4x bigger distances
        this.scene.fog = new THREE.Fog(0x87CEEB, 2000, 8000); // 4x bigger (was 500, 2000)

        console.log('Lighting setup complete');
    }

    createSkybox() {
        // Simple sky dome - 4x bigger to match terrain
        const skyGeometry = new THREE.SphereGeometry(20000, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5); // 4x bigger (was 5000)
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        
        const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(skybox);
        
        console.log('Simple sky created');
    }

    createSimpleDebugGrid() {
        // Create invisible grid for debugging
        const gridGroup = new THREE.Group();
        gridGroup.name = 'DebugGrid';
        
        // Simple ground grid
        const gridHelper = new THREE.GridHelper(this.terrainSize, 20, 0x00ff00, 0x004400);
        gridHelper.position.y = 5; // Slightly above terrain
        gridGroup.add(gridHelper);
        
        // Coordinate axes
        const axesHelper = new THREE.AxesHelper(500);
        gridGroup.add(axesHelper);
        
        this.scene.add(gridGroup);
        this.debugGrid = gridGroup;
        
        // Make invisible by default
        this.debugGrid.visible = false;
        console.log('Simple debug grid created (hidden)');
    }

    // Get spawn position above terrain
    getSpawnPosition() {
        const terrainHeight = this.getTerrainHeightAt(0, 0);
        const safeSpawnHeight = terrainHeight + this.spawnHeight;
        return new THREE.Vector3(0, safeSpawnHeight, 0);
    }

    // Get corner spawn position for racing start
    getCornerSpawnPosition() {
        const cornerOffset = this.terrainSize * 0.3;
        const spawnX = -cornerOffset;
        const spawnZ = -cornerOffset;
        
        const terrainHeight = this.getTerrainHeightAt(spawnX, spawnZ);
        const safeSpawnHeight = terrainHeight + this.spawnHeight;
        
        return new THREE.Vector3(spawnX, safeSpawnHeight, spawnZ);
    }

    // Get terrain height at specific world position
    getTerrainHeightAt(x, z) {
        if (!this.terrain) return 0;
        
        const geometry = this.terrain.geometry;
        const vertices = geometry.attributes.position.array;
        
        // Convert world coordinates to terrain-local coordinates
        const localX = x + this.terrainSize / 2;
        const localZ = z + this.terrainSize / 2;
        
        // Convert to vertex indices
        const segmentSizeX = this.terrainSize / this.terrainSegments;
        const segmentSizeZ = this.terrainSize / this.terrainSegments;
        
        const gridX = Math.floor(localX / segmentSizeX);
        const gridZ = Math.floor(localZ / segmentSizeZ);
        
        // Ensure we're within bounds
        const clampedX = Math.max(0, Math.min(gridX, this.terrainSegments - 1));
        const clampedZ = Math.max(0, Math.min(gridZ, this.terrainSegments - 1));
        
        // Get vertex index
        const index = clampedZ * (this.terrainSegments + 1) + clampedX;
        const vertexIndex = index * 3;
        
        // Return height (Y coordinate)
        if (vertexIndex + 2 < vertices.length) {
            return vertices[vertexIndex + 2];
        }
        
        return 0;
    }

    // Debug method to log terrain info
    logTerrainInfo() {
        if (!this.terrain) {
            console.log('No terrain loaded');
            return;
        }
        
        const centerHeight = this.getTerrainHeightAt(0, 0);
        
        console.log('=== TERRAIN INFO ===');
        console.log(`Center height: ${centerHeight.toFixed(2)}`);
        console.log(`Terrain size: ${this.terrainSize}`);
        console.log(`Height scale: ${this.heightScale}`);
        console.log(`Spawn height: ${this.spawnHeight}`);
        console.log('===================');
    }
}
