import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

export class Environment {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.terrain = null;
        this.terrainSize = config.terrainSize || 4000;
        this.heightScale = config.heightScale || 800;
        this.terrainSegments = config.terrainSegments || 256;
        this.spawnHeight = config.spawnHeight || 300;
        
        // Mountain placement configuration
        this.mountainConfig = {
            maxMountains: config.maxMountains || 6,
            flatAreaDivisor: config.flatAreaDivisor || 800,
            minMountains: config.minMountains || 1
        };
        
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
        // Load heightmap (PNG)
        const heightmapTexture = await this.loadPNGTexture(this.assetPaths.heightmap);
        
        // Load diffuse texture (EXR)
        const diffuseTexture = await this.loadEXRTexture(this.assetPaths.diffuse);
        
        // Load bump map (EXR)
        const bumpTexture = await this.loadEXRTexture(this.assetPaths.bumpMap);
        
        // Create terrain geometry
        const geometry = new THREE.PlaneGeometry(
            this.terrainSize, 
            this.terrainSize, 
            this.terrainSegments, 
            this.terrainSegments
        );
        
        // Extract height data from heightmap
        const heightData = await this.extractHeightData(heightmapTexture);
        
        // Apply heightmap to geometry
        this.applyHeightmapToGeometry(geometry, heightData);
        
        // Create material with diffuse and bump map
        const material = this.createTerrainMaterial(diffuseTexture, bumpTexture);
        
        // Create terrain mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.position.y = 0;
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = true;
        
        this.scene.add(this.terrain);
        
        console.log('Terrain created successfully');
        
        // Add terrain info to console for debugging
        setTimeout(() => {
            this.logTerrainInfo();
            
            // Make terrain methods available in console for debugging
            window.terrainDebug = {
                getHeight: (x, z) => this.getTerrainHeightAt(x, z),
                info: () => this.logTerrainInfo(),
                spawn: () => this.getSpawnPosition(),
                cornerSpawn: () => this.getCornerSpawnPosition()
            };
            
            console.log('Terrain debug methods available: terrainDebug.getHeight(x, z), terrainDebug.info(), terrainDebug.spawn(), terrainDebug.cornerSpawn()');
        }, 100);
    }

    loadPNGTexture(path) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(path, resolve, undefined, reject);
        });
    }

    loadEXRTexture(path) {
        return new Promise((resolve, reject) => {
            const loader = new EXRLoader();
            loader.load(path, resolve, undefined, reject);
        });
    }

    async extractHeightData(heightmapTexture) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            
            img.onload = () => {
                try {
                    canvas.width = this.terrainSegments + 1;
                    canvas.height = this.terrainSegments + 1;
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    const heightData = [];
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        // Use red channel for height (grayscale)
                        const height = imageData.data[i] / 255;
                        heightData.push(height);
                    }
                    
                    // Clean up canvas and context for garbage collection
                    canvas.width = 0;
                    canvas.height = 0;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    resolve(heightData);
                } catch (error) {
                    reject(new Error(`Failed to extract height data: ${error.message}`));
                }
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load heightmap image: ${heightmapTexture.image.src}`));
            };
            
            img.src = heightmapTexture.image.src;
        });
    }

    applyHeightmapToGeometry(geometry, heightData) {
        const vertices = geometry.attributes.position.array;
        
        // First pass: apply heightmap with dramatic scaling and add base noise
        const flatAreas = [];
        const heightThreshold = 0.15; // Adjusted for more varied terrain
        
        for (let i = 0; i < vertices.length; i += 3) {
            const index = Math.floor(i / 3);
            if (heightData[index] !== undefined) {
                const x = vertices[i];
                const y = vertices[i + 1];
                
                // Dramatically scale up the original heightmap mountains
                let height = heightData[index] * this.heightScale * 2.5; // 2.5x scale increase
                
                // Add base terrain noise to make everything more uneven
                height += this.generateTerrainNoise(x, y);
                
                // Add rolling hills to break up flat areas
                height += this.generateRollingHills(x, y);
                
                vertices[i + 2] = height;
                
                // Identify relatively flat areas for mountain placement (after noise)
                if (heightData[index] < heightThreshold) {
                    flatAreas.push({ index, x, y, originalHeight: height });
                }
            }
        }
        
        // Find mountain regions in the heightmap for copying
        const mountainRegions = this.findMountainRegions(heightData);
        
        // Place additional mountains in flat areas
        this.placeMountainsInFlatAreas(vertices, flatAreas, mountainRegions, heightData);
        
        // Final pass: add detail noise to entire terrain
        this.addDetailNoise(vertices);
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    generateTerrainNoise(x, y) {
        // Multi-octave noise for varied, uneven ground
        let noise = 0;
        
        // Large geological features
        noise += Math.sin(x * 0.001) * Math.cos(y * 0.001) * 80;
        noise += Math.sin(x * 0.002) * Math.cos(y * 0.002) * 40;
        
        // Medium terrain variation
        noise += Math.sin(x * 0.005) * Math.cos(y * 0.005) * 25;
        noise += Math.sin(x * 0.01) * Math.cos(y * 0.01) * 15;
        
        // Fine surface detail
        noise += Math.sin(x * 0.02) * Math.cos(y * 0.02) * 8;
        
        return noise;
    }

    generateRollingHills(x, y) {
        // Create rolling hills across the terrain
        let hills = 0;
        
        // Large rolling hills
        hills += Math.sin(x * 0.0015) * Math.cos(y * 0.0015) * 60;
        hills += Math.sin(x * 0.003) * Math.cos(y * 0.003) * 30;
        
        // Medium undulation
        hills += Math.sin(x * 0.006) * Math.cos(y * 0.006) * 20;
        
        // Slight randomness
        hills += Math.sin(x * 0.0123) * Math.cos(y * 0.0321) * 12;
        
        return hills;
    }

    addDetailNoise(vertices) {
        // Add fine detail noise to entire terrain for realism
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const currentHeight = vertices[i + 2];
            
            // Fine rocky/surface detail
            const detail = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 3 +
                          Math.sin(x * 0.1) * Math.cos(y * 0.1) * 2 +
                          Math.sin(x * 0.2) * Math.cos(y * 0.2) * 1;
            
            vertices[i + 2] = currentHeight + detail;
        }
    }

    findMountainRegions(heightData) {
        const mountainRegions = [];
        const segmentSize = this.terrainSegments + 1;
        const mountainThreshold = 0.7; // Areas above this are considered mountains
        
        // Scan for mountain regions
        for (let y = 0; y < segmentSize; y++) {
            for (let x = 0; x < segmentSize; x++) {
                const index = y * segmentSize + x;
                if (heightData[index] > mountainThreshold) {
                    // Found a mountain peak, extract surrounding region
                    const region = this.extractMountainRegion(heightData, x, y, segmentSize);
                    if (region.size > 100) { // Only use significant mountain regions
                        mountainRegions.push(region);
                    }
                }
            }
        }
        
        return mountainRegions;
    }

    extractMountainRegion(heightData, centerX, centerY, segmentSize) {
        const region = { centerX, centerY, heights: [], size: 0 };
        const radius = 20; // Extract 40x40 region around mountain peak
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x >= 0 && x < segmentSize && y >= 0 && y < segmentSize) {
                    const index = y * segmentSize + x;
                    region.heights.push({
                        offsetX: dx,
                        offsetY: dy,
                        height: heightData[index]
                    });
                    region.size++;
                }
            }
        }
        
        return region;
    }

    placeMountainsInFlatAreas(vertices, flatAreas, mountainRegions, heightData) {
        if (mountainRegions.length === 0) return;
        
        // Ensure at least minimum mountains are placed, using configurable values
        const numMountains = Math.max(
            this.mountainConfig.minMountains,
            Math.min(
                this.mountainConfig.maxMountains,
                Math.floor(flatAreas.length / this.mountainConfig.flatAreaDivisor)
            )
        );
        
        const selectedAreas = [];
        
        // Use deterministic placement based on flat area positions for consistency
        // Sort flat areas by position to ensure consistent ordering
        flatAreas.sort((a, b) => a.x + a.y - (b.x + b.y));
        
        for (let i = 0; i < numMountains; i++) {
            // Use deterministic selection instead of random
            const areaIndex = Math.floor((i / numMountains) * flatAreas.length);
            const area = flatAreas[areaIndex];
            
            // Ensure areas are spread out
            const minDistance = 400;
            const tooClose = selectedAreas.some(selected => 
                Math.abs(selected.x - area.x) < minDistance || 
                Math.abs(selected.y - area.y) < minDistance
            );
            
            if (!tooClose) {
                selectedAreas.push(area);
            } else {
                // Try next area if too close
                for (let j = areaIndex + 1; j < flatAreas.length; j++) {
                    const nextArea = flatAreas[j];
                    const stillTooClose = selectedAreas.some(selected => 
                        Math.abs(selected.x - nextArea.x) < minDistance || 
                        Math.abs(selected.y - nextArea.y) < minDistance
                    );
                    if (!stillTooClose) {
                        selectedAreas.push(nextArea);
                        break;
                    }
                }
            }
        }
        
        // Place mountains in selected areas with consistent scaling
        selectedAreas.forEach((area, mountainIndex) => {
            const mountainRegion = mountainRegions[mountainIndex % mountainRegions.length];
            // Use deterministic scaling based on position instead of random
            const scale = 1.2 + ((area.x + area.y) % 100) / 125; // Deterministic scale 1.2-2.0
            this.placeMountainAt(vertices, area.x, area.y, mountainRegion, scale);
        });
        
        console.log(`Placed ${selectedAreas.length} additional mountain regions (deterministic placement)`);
    }

    placeMountainAt(vertices, targetX, targetY, mountainRegion, scale = null) {
        const segmentSize = this.terrainSegments + 1;
        // Use deterministic scaling if not provided
        const mountainScale = scale || (1.2 + ((targetX + targetY) % 100) / 125);
        
        mountainRegion.heights.forEach(point => {
            const worldX = targetX + point.offsetX * (this.terrainSize / segmentSize);
            const worldY = targetY + point.offsetY * (this.terrainSize / segmentSize);
            
            // Find closest vertex
            for (let i = 0; i < vertices.length; i += 3) {
                const vx = vertices[i];
                const vy = vertices[i + 1];
                const distance = Math.sqrt((vx - worldX) ** 2 + (vy - worldY) ** 2);
                
                if (distance < 25) { // Slightly larger influence radius
                    const mountainHeight = point.height * this.heightScale * 2.5 * mountainScale;
                    const currentHeight = vertices[i + 2];
                    
                    // Blend the mountain height with existing terrain
                    const blendFactor = Math.max(0, 1 - distance / 25);
                    vertices[i + 2] = Math.max(currentHeight, mountainHeight * blendFactor);
                }
            }
        });
    }

    createTerrainMaterial(diffuseTexture, bumpTexture) {
        const material = new THREE.MeshStandardMaterial({
            map: diffuseTexture,
            bumpMap: bumpTexture,
            bumpScale: 0.5,
            roughness: 0.8,
            metalness: 0.1
        });
        
        return material;
    }

    createLighting() {
        // Clear existing lights
        this.scene.traverse((child) => {
            if (child instanceof THREE.Light) {
                this.scene.remove(child);
            }
        });

        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(1000, 1000, 500);
        directionalLight.castShadow = true;

        // Configure shadows
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 3000;
        directionalLight.shadow.camera.left = -2000;
        directionalLight.shadow.camera.right = 2000;
        directionalLight.shadow.camera.top = 2000;
        directionalLight.shadow.camera.bottom = -2000;

        this.scene.add(directionalLight);

        // Hemisphere light for realistic sky lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1a, 0.4);
        this.scene.add(hemisphereLight);

        // Enable fog for atmospheric perspective
        this.scene.fog = new THREE.Fog(0x87CEEB, 1000, 3000);

        console.log('Lighting setup complete');
    }

    createSkybox() {
        // Create hemisphere sky dome (more realistic than full sphere)
        const skyGeometry = new THREE.SphereGeometry(5000, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x4A90E2) },
                bottomColor: { value: new THREE.Color(0xE6F3FF) },
                offset: { value: 300 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false
        });
        
        const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        skybox.renderOrder = -1; // Render behind everything
        this.scene.add(skybox);
        
        console.log('Sky dome created successfully');
    }

    // Get spawn position above terrain
    getSpawnPosition() {
        // Get actual terrain height at center (0, 0)
        const terrainHeight = this.getTerrainHeightAt(0, 0);
        const safeSpawnHeight = terrainHeight + 100; // 100 units above terrain
        return new THREE.Vector3(0, safeSpawnHeight, 0);
    }

    // Get corner spawn position for racing start
    getCornerSpawnPosition() {
        // Spawn at one of the corners for a racing start
        const cornerOffset = this.terrainSize * 0.4; // 40% from center toward corner
        const spawnX = -cornerOffset; // Left side
        const spawnZ = -cornerOffset; // Front side
        
        const terrainHeight = this.getTerrainHeightAt(spawnX, spawnZ);
        const safeSpawnHeight = terrainHeight + 150; // Higher spawn for racing start
        
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
        const maxHeight = this.findMaxTerrainHeight();
        const minHeight = this.findMinTerrainHeight();
        
        console.log('=== TERRAIN INFO ===');
        console.log(`Center height: ${centerHeight.toFixed(2)}`);
        console.log(`Max height: ${maxHeight.toFixed(2)}`);
        console.log(`Min height: ${minHeight.toFixed(2)}`);
        console.log(`Terrain size: ${this.terrainSize}`);
        console.log(`Height scale: ${this.heightScale}`);
        console.log(`Spawn height: ${this.spawnHeight}`);
        console.log('===================');
    }

    findMaxTerrainHeight() {
        if (!this.terrain) return 0;
        
        const vertices = this.terrain.geometry.attributes.position.array;
        let maxHeight = -Infinity;
        
        for (let i = 2; i < vertices.length; i += 3) {
            maxHeight = Math.max(maxHeight, vertices[i]);
        }
        
        return maxHeight;
    }

    findMinTerrainHeight() {
        if (!this.terrain) return 0;
        
        const vertices = this.terrain.geometry.attributes.position.array;
        let minHeight = Infinity;
        
        for (let i = 2; i < vertices.length; i += 3) {
            minHeight = Math.min(minHeight, vertices[i]);
        }
        
        return minHeight;
    }
}
