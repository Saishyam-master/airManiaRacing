import * as THREE from 'three';

/**
 * Invisible Debug Grid System
 * Provides comprehensive 3D coordinate system for debugging and positioning
 * Completely separate from environment - can be toggled without affecting terrain
 */
export class DebugGrid {
    constructor(scene, terrainSize = 16000) {
        this.scene = scene;
        this.terrainSize = terrainSize;
        this.gridGroup = null;
        this.isVisible = false; // Always invisible by default
        
        console.log('Debug Grid System initialized (invisible)');
    }

    /**
     * Create the comprehensive debug grid system
     */
    createGrid() {
        console.log('Creating comprehensive invisible debug grid...');
        
        // Create main grid group
        this.gridGroup = new THREE.Group();
        this.gridGroup.name = 'DebugGrid';
        
        // Grid parameters perfectly aligned with 4x terrain (16000 units)
        const gridSize = this.terrainSize; // 16000 units
        const majorDivisions = 16; // Major grid lines every 1000 units
        const minorDivisions = 80; // Minor grid lines every 200 units
        const majorGridStep = gridSize / majorDivisions; // 1000 units per major division
        const minorGridStep = gridSize / minorDivisions; // 200 units per minor division
        
        // Ground level grids (XZ plane)
        this.createGroundGrids(gridSize, majorDivisions, minorDivisions);
        
        // Vertical reference grids
        this.createVerticalGrids();
        
        // Enhanced coordinate system
        this.createCoordinateSystem();
        
        // Coordinate labels
        this.createCoordinateLabels(majorGridStep, majorDivisions);
        
        // Altitude markers
        this.createAltitudeMarkers();
        
        // Corner and center markers
        this.createPositionMarkers();
        
        // Add to scene
        this.scene.add(this.gridGroup);
        
        // Make invisible by default (for debugging only)
        this.gridGroup.visible = false;
        
        console.log(`Debug grid created: ${gridSize}x${gridSize} units`);
        console.log('Grid is INVISIBLE by default - use gridDebug.show() to make visible');
        
        // Make grid controls available globally
        this.createGlobalControls();
    }

    /**
     * Create ground level grids (XZ plane)
     */
    createGroundGrids(gridSize, majorDivisions, minorDivisions) {
        // Major grid (every 1000 units)
        const majorGrid = new THREE.GridHelper(gridSize, majorDivisions, 0x00ff00, 0x006600);
        majorGrid.position.y = 0;
        majorGrid.name = 'MajorGrid';
        this.gridGroup.add(majorGrid);
        
        // Minor grid (every 200 units)
        const minorGrid = new THREE.GridHelper(gridSize, minorDivisions, 0x004400, 0x002200);
        minorGrid.position.y = 1; // Slightly above major grid
        minorGrid.name = 'MinorGrid';
        this.gridGroup.add(minorGrid);
    }

    /**
     * Create vertical reference grids
     */
    createVerticalGrids() {
        // Vertical grid XY plane (side view) - reduced size for clarity
        const verticalGridXY = new THREE.GridHelper(4000, 20, 0xff0000, 0x660000);
        verticalGridXY.rotation.z = Math.PI / 2;
        verticalGridXY.position.z = 0;
        verticalGridXY.position.y = 2000; // Center at 2000m altitude
        verticalGridXY.name = 'VerticalGridXY';
        this.gridGroup.add(verticalGridXY);
        
        // Vertical grid YZ plane (front view) - reduced size for clarity
        const verticalGridYZ = new THREE.GridHelper(4000, 20, 0x0000ff, 0x000066);
        verticalGridYZ.rotation.x = Math.PI / 2;
        verticalGridYZ.position.x = 0;
        verticalGridYZ.position.y = 2000; // Center at 2000m altitude
        verticalGridYZ.name = 'VerticalGridYZ';
        this.gridGroup.add(verticalGridYZ);
    }

    /**
     * Create enhanced coordinate system
     */
    createCoordinateSystem() {
        // Enhanced coordinate axes with better visibility
        const axesHelper = new THREE.AxesHelper(2000);
        axesHelper.name = 'CoordinateAxes';
        this.gridGroup.add(axesHelper);
    }

    /**
     * Create coordinate labels at major intersections
     */
    createCoordinateLabels(gridStep, gridDivisions) {
        const halfDivisions = Math.floor(gridDivisions / 2);
        
        // Major coordinate markers every 2000 units (skip some for clarity)
        for (let i = -halfDivisions; i <= halfDivisions; i += 2) {
            for (let j = -halfDivisions; j <= halfDivisions; j += 2) {
                if (i === 0 && j === 0) continue; // Skip origin (handled separately)
                
                const x = i * gridStep;
                const z = j * gridStep;
                
                // Create coordinate label
                const label = this.createTextSprite(`(${Math.round(x)}, ${Math.round(z)})`, '#ffff00', 16, '#000066');
                label.position.set(x, 100, z);
                label.name = `CoordLabel_${x}_${z}`;
                this.gridGroup.add(label);
            }
        }
        
        // Enhanced origin marker
        const originLabel = this.createTextSprite('ORIGIN (0, 0, 0)', '#ff0000', 24, '#000000');
        originLabel.position.set(0, 150, 0);
        originLabel.name = 'OriginLabel';
        this.gridGroup.add(originLabel);
        
        // Add axis labels
        const xAxisLabel = this.createTextSprite('X AXIS →', '#ff0000', 18, '#330000');
        xAxisLabel.position.set(1500, 50, 0);
        xAxisLabel.name = 'XAxisLabel';
        this.gridGroup.add(xAxisLabel);
        
        const zAxisLabel = this.createTextSprite('Z AXIS ↑', '#0000ff', 18, '#000033');
        zAxisLabel.position.set(0, 50, 1500);
        zAxisLabel.name = 'ZAxisLabel';
        this.gridGroup.add(zAxisLabel);
        
        const yAxisLabel = this.createTextSprite('Y AXIS ↑', '#00ff00', 18, '#003300');
        yAxisLabel.position.set(0, 1500, 0);
        yAxisLabel.name = 'YAxisLabel';
        this.gridGroup.add(yAxisLabel);
    }

    /**
     * Create altitude reference markers
     */
    createAltitudeMarkers() {
        const altitudes = [0, 250, 500, 750, 1000, 1500, 2000, 2500, 3000];
        
        altitudes.forEach((altitude) => {
            if (altitude === 0) return; // Skip ground level
            
            // Create subtle horizontal reference rings
            const ringGeometry = new THREE.RingGeometry(800, 1000, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff, 
                transparent: true, 
                opacity: 0.2,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = altitude;
            ring.name = `AltitudeRing_${altitude}`;
            this.gridGroup.add(ring);
            
            // Altitude labels
            const altLabel = this.createTextSprite(`ALT: ${altitude}m`, '#00ffff', 18, '#000066');
            altLabel.position.set(1200, altitude, 0);
            altLabel.name = `AltitudeLabel_${altitude}`;
            this.gridGroup.add(altLabel);
            
            // Altitude indicator pillars
            const pillarGeometry = new THREE.CylinderGeometry(5, 5, 50);
            const pillarMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff,
                transparent: true,
                opacity: 0.6
            });
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(1000, altitude, 0);
            pillar.name = `AltitudePillar_${altitude}`;
            this.gridGroup.add(pillar);
        });
    }

    /**
     * Create corner and center position markers
     */
    createPositionMarkers() {
        // Corner markers for terrain bounds
        const halfSize = this.terrainSize / 2;
        const corners = [
            { x: -halfSize, z: -halfSize, label: 'SW CORNER' },
            { x: halfSize, z: -halfSize, label: 'SE CORNER' },
            { x: -halfSize, z: halfSize, label: 'NW CORNER' },
            { x: halfSize, z: halfSize, label: 'NE CORNER' }
        ];
        
        corners.forEach((corner) => {
            // Tall pillar at each corner
            const pillarGeometry = new THREE.CylinderGeometry(10, 20, 200);
            const pillarMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff6600,
                transparent: true,
                opacity: 0.8
            });
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(corner.x, 100, corner.z);
            pillar.name = `CornerPillar_${corner.label.replace(' ', '_')}`;
            this.gridGroup.add(pillar);
            
            // Corner label
            const cornerLabel = this.createTextSprite(corner.label, '#ff6600', 20, '#330000');
            cornerLabel.position.set(corner.x, 250, corner.z);
            cornerLabel.name = `CornerLabel_${corner.label.replace(' ', '_')}`;
            this.gridGroup.add(cornerLabel);
        });
        
        // Special center marker with pulsing effect
        const centerGeometry = new THREE.SphereGeometry(30);
        const centerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        const centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
        centerSphere.position.set(0, 50, 0);
        centerSphere.name = 'CenterMarker';
        this.gridGroup.add(centerSphere);
        
        // Animate center marker with pulsing effect
        let time = 0;
        const animateCenter = () => {
            time += 0.02;
            centerSphere.scale.setScalar(1 + Math.sin(time) * 0.2);
            requestAnimationFrame(animateCenter);
        };
        animateCenter();
    }

    /**
     * Create text sprite helper
     */
    createTextSprite(text, color = '#ffffff', fontSize = 20, backgroundColor = '#000000') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Background
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Border
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        // Text
        context.fillStyle = color;
        context.font = `${fontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(150, 40, 1);
        return sprite;
    }

    /**
     * Create global debug controls
     */
    createGlobalControls() {
        // Make grid controls available globally
        window.gridDebug = {
            show: () => this.show(),
            hide: () => this.hide(),
            toggle: () => this.toggle(),
            info: () => this.logGridInfo(),
            isVisible: () => this.isVisible
        };
        
        console.log('Grid debug controls available:');
        console.log('  gridDebug.show() - Make grid visible');
        console.log('  gridDebug.hide() - Make grid invisible');
        console.log('  gridDebug.toggle() - Toggle grid visibility');
        console.log('  gridDebug.info() - Show grid information');
        console.log('  gridDebug.isVisible() - Check if grid is visible');
    }

    /**
     * Show the debug grid
     */
    show() {
        if (this.gridGroup) {
            this.gridGroup.visible = true;
            this.isVisible = true;
            console.log('🔧 DEBUG MODE: Grid is now VISIBLE for development');
            this.logGridInfo();
        }
    }

    /**
     * Hide the debug grid
     */
    hide() {
        if (this.gridGroup) {
            this.gridGroup.visible = false;
            this.isVisible = false;
            console.log('🎮 PLAYER MODE: Grid is now HIDDEN for clean gameplay');
        }
    }

    /**
     * Toggle grid visibility
     */
    toggle() {
        if (this.gridGroup) {
            this.gridGroup.visible = !this.gridGroup.visible;
            this.isVisible = this.gridGroup.visible;
            if (this.isVisible) {
                this.show();
            } else {
                this.hide();
            }
        }
    }

    /**
     * Log grid information
     */
    logGridInfo() {
        console.log('=== DEBUG GRID INFO ===');
        console.log(`Grid Size: ${this.terrainSize} x ${this.terrainSize} units`);
        console.log(`Major Grid Lines: Every 1000 units (16 divisions)`);
        console.log(`Minor Grid Lines: Every 200 units (80 divisions)`);
        console.log(`Terrain Bounds: X: ${-this.terrainSize/2} to ${this.terrainSize/2}`);
        console.log(`Terrain Bounds: Z: ${-this.terrainSize/2} to ${this.terrainSize/2}`);
        console.log(`Altitude Markers: 0m to 3000m`);
        console.log(`Colors: Ground(Green), Vertical XY(Red), Vertical YZ(Blue), Altitude(Cyan)`);
        console.log(`Status: ${this.isVisible ? 'VISIBLE (Debug Mode)' : 'HIDDEN (Player Mode)'}`);
        console.log('🔧 This grid is for debugging only - invisible to players by default');
        console.log('========================');
    }

    /**
     * Destroy the grid system
     */
    destroy() {
        if (this.gridGroup) {
            this.scene.remove(this.gridGroup);
            this.gridGroup = null;
            this.isVisible = false;
            delete window.gridDebug;
            console.log('Debug grid system destroyed');
        }
    }
}
