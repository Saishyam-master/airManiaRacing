import * as THREE from 'three';

export class Environment {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.terrain = null;
        this.terrainSize = config.terrainSize || 16000;
        this.heightScale = config.heightScale || 400;
        this.terrainSegments = config.terrainSegments || 128;
        this.spawnHeight = config.spawnHeight || 200;
        
        console.log('Simple Environment initialized - no complex asset loading');
    }

    async init() {
        try {
            console.log('Starting simple environment initialization...');
            await this.createSimpleTerrain();
            this.createLighting();
            this.createSkybox();
            console.log('Simple environment initialized successfully');
        } catch (error) {
            console.error('Error initializing simple environment:', error);
        }
    }

    async createSimpleTerrain() {
        console.log('Creating simple procedural terrain...');
        
        // Create terrain geometry
        const geometry = new THREE.PlaneGeometry(
            this.terrainSize, 
            this.terrainSize, 
            this.terrainSegments, 
            this.terrainSegments
        );
        
        // Add procedural height variation
        this.addProceduralHeights(geometry);
        
        // Try to load heightmap if available, otherwise use procedural
        try {
            const heightmapTexture = await this.loadPNGTexture('assets/Rocky Land and Rivers/Height Map PNG.png');
            console.log('Heightmap loaded, applying to terrain...');
            const heightData = await this.extractHeightData(heightmapTexture);
            this.applyHeightmapToGeometry(geometry, heightData);
            console.log('Heightmap applied successfully');
        } catch (error) {
            console.log('Could not load heightmap, using procedural terrain:', error.message);
        }
        
        // Create simple material
        const material = new THREE.MeshLambertMaterial({
            color: 0x567d46, // Natural terrain green
            wireframe: false
        });
        
        // Try to load diffuse texture as overlay
        try {
            const diffuseTexture = await this.loadPNGTexture('assets/Rocky Land and Rivers/Rocky-Land-and-Rivers-Image.png');
            console.log('Diffuse texture loaded successfully');
            material.map = diffuseTexture;
            diffuseTexture.wrapS = THREE.RepeatWrapping;
            diffuseTexture.wrapT = THREE.RepeatWrapping;
            diffuseTexture.repeat.set(2, 2);
        } catch (error) {
            console.log('Could not load diffuse texture, using solid color:', error.message);
        }
        
        // Create terrain mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.position.y = 0;
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = true;
        
        this.scene.add(this.terrain);
        console.log('Simple terrain created successfully');
        
        // Make terrain methods available for debugging
        window.terrainDebug = {
            getHeight: (x, z) => this.getTerrainHeightAt(x, z),
            info: () => this.logTerrainInfo(),
            spawn: () => this.getSpawnPosition()
        };
    }

    loadPNGTexture(path) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                path, 
                (texture) => {
                    console.log(`PNG texture loaded: ${path}`);
                    resolve(texture);
                },
                (progress) => {
                    console.log(`Loading PNG progress: ${path} - ${Math.round(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    console.error(`Error loading PNG texture: ${path}`, error);
                    reject(error);
                }
            );
        });
    }

    async extractHeightData(heightmapTexture) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = () => {
                canvas.width = this.terrainSegments + 1;
                canvas.height = this.terrainSegments + 1;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                const heightData = [];
                for (let i = 0; i < data.length; i += 4) {
                    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    heightData.push(brightness / 255);
                }
                
                resolve(heightData);
            };
            img.src = heightmapTexture.image.src;
        });
    }

    applyHeightmapToGeometry(geometry, heightData) {
        const vertices = geometry.attributes.position.array;
        const segmentCount = this.terrainSegments + 1;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const index = Math.floor(i / 3);
            const heightValue = heightData[index] || 0;
            vertices[i + 2] = heightValue * this.heightScale;
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        console.log('Heightmap applied to geometry');
    }

    addProceduralHeights(geometry) {
        const vertices = geometry.attributes.position.array;
        
        // Add procedural height variation
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            
            // Simple height variation using noise
            let height = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 100;
            height += Math.sin(x * 0.005) * Math.cos(y * 0.005) * 200;
            height += Math.sin(x * 0.002) * Math.cos(y * 0.002) * 300;
            
            vertices[i + 2] = height;
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        console.log('Procedural heights added to terrain');
    }

    createLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(100, 300, 100);
        directionalLight.castShadow = true;

        // Shadow settings
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 1000;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;

        this.scene.add(directionalLight);
        console.log('Simple lighting created');
    }

    createSkybox() {
        // Simple sky dome
        const skyGeometry = new THREE.SphereGeometry(20000, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        
        const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(skybox);
        console.log('Simple sky created');
    }

    // Get spawn position above terrain
    getSpawnPosition() {
        const terrainHeight = this.getTerrainHeightAt(0, 0);
        const safeSpawnHeight = terrainHeight + this.spawnHeight;
        return new THREE.Vector3(0, safeSpawnHeight, 0);
    }

    // Get terrain height at specific world position
    getTerrainHeightAt(x, z) {
        if (!this.terrain) return 0;
        
        // Simple height lookup - this is basic and can be improved
        const geometry = this.terrain.geometry;
        if (!geometry.attributes.position) return 0;
        
        // For now, return a simple height calculation
        // In a real implementation, you'd do proper terrain height sampling
        return Math.sin(x * 0.01) * Math.cos(z * 0.01) * 100 + 
               Math.sin(x * 0.005) * Math.cos(z * 0.005) * 200;
    }

    // Debug method to log terrain info
    logTerrainInfo() {
        if (!this.terrain) {
            console.log('No terrain loaded');
            return;
        }
        
        const centerHeight = this.getTerrainHeightAt(0, 0);
        
        console.log('=== SIMPLE TERRAIN INFO ===');
        console.log(`Center height: ${centerHeight.toFixed(2)}`);
        console.log(`Terrain size: ${this.terrainSize}`);
        console.log(`Height scale: ${this.heightScale}`);
        console.log(`Spawn height: ${this.spawnHeight}`);
        console.log('===========================');
    }
}
