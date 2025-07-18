# Air Mania Racing - Development Documentation

## Project Overview
A flight racing game built with Three.js and modern web technologies. This documentation tracks the development progress and workflow used throughout the project.

## 🔄 Development Workflow with CodeRabbit

### Initial Setup (Completed)
1. ✅ Initialize local Git repository
2. ✅ Create GitHub repository: `airManiaRacing`
3. ✅ Push initial code to `main` branch
4. ✅ Set up development environment with Vite

### Branch-Based Development Workflow

#### 1. Feature Development Process
```bash
# Step 1: Start from main branch
git checkout main
git pull origin main

# Step 2: Create new feature branch
git checkout -b feature/branch-name
# Examples:
# - feature/aircraft-physics
# - feature/race-track
# - feature/ui-improvements
# - bugfix/camera-controls
```

#### 2. Development Cycle
```bash
# Make your changes and commits
git add .
git commit -m "feat: descriptive commit message"

# Push branch to GitHub
git push -u origin feature/branch-name
```

#### 3. Pull Request & Review Process
1. **Create Pull Request** on GitHub
   - Base branch: `main`
   - Compare branch: `feature/branch-name`
   - Add descriptive title and description
   
2. **CodeRabbit Review**
   - CodeRabbit will automatically review the PR
   - Address any suggestions or issues
   - Make additional commits if needed
   
3. **Merge Process**
   ```bash
   # After PR approval, merge to main
   git checkout main
   git pull origin main
   git branch -d feature/branch-name  # Delete local branch
   git push origin --delete feature/branch-name  # Delete remote branch
   ```

### 📝 Commit Message Conventions
Follow conventional commits for better documentation:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat: add realistic aircraft physics with lift and drag"
git commit -m "fix: camera following aircraft smoothly"
git commit -m "docs: update development workflow documentation"
```

## 🚀 Quick Reference Commands

### Starting New Feature
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Daily Development
```bash
# Make changes
git add .
git commit -m "feat: your changes"
git push -u origin feature/your-feature-name
```

### After PR Merge
```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

## 📊 Development Progress Tracking

### Phase 1: Modern Professional UI ✅
- [x] Project setup with Vite
- [x] Professional aviation-themed starting page
- [x] Modern gradient backgrounds and animations
- [x] Clean typography with Orbitron font
- [x] Responsive design with glass-morphism effects
- [x] Basic Three.js scene integration
- [x] Simple aircraft model
- [x] Basic flight controls (WASD + Space)
- [x] Camera following system
- [x] UI elements (speed, altitude, score)

### Phase 1.5: Advanced UI with 3D Jet Centerpiece ✅
- [x] Modern grid-based layout with jet as centerpiece
- [x] Custom GLB model integration (airManiaJet.glb)
- [x] GLTFLoader implementation for 3D model loading
- [x] Professional 3D lighting setup with SpotLight and AmbientLight
- [x] Smooth rotation and floating animation for jet display
- [x] Clean minimalist aesthetic with transparent background
- [x] Optimized jet scale (0.8x) and camera positioning
- [x] Loading progress indicator with smooth fade transitions
- [x] Fallback procedural jet for GLB loading failures
- [x] Enhanced UI responsiveness across desktop and mobile
- [x] Separate 3D scene for jet display with independent rendering
- [x] Material preservation to show original jet colors accurately
- [x] Performance optimized with transparent background rendering
- [x] Modular code structure with dedicated jet display functions

### Phase 2: Professional Racing Elements (In Progress)
- [x] Created feature branch for Trackmania-style racing
- [ ] Trackmania-style race track with clean geometry
- [ ] Checkpoint gates with visual feedback
- [ ] Lap timing system with professional UI
- [ ] Track boundaries and collision detection
- [ ] Speed zones and boost sections

### Phase 3: Trackmania-Inspired Visuals
- [ ] Clean, modern track surfaces (concrete/metal style)
- [ ] Professional lighting setup
- [ ] Polished aircraft models with clean textures
- [ ] Particle effects for speed and boosts
- [ ] Environmental details (minimal but impactful)

### Phase 4: Enhanced Flight Physics
- [ ] Arcade-style but believable aerodynamics
- [ ] Smooth banking and momentum
- [ ] Air resistance and acceleration curves
- [ ] Responsive but weighty controls

### Phase 5: Game Features
- [ ] Multiple game modes
- [ ] Aircraft customization
- [ ] Achievement system
- [ ] Leaderboards

## 🛠️ Development Environment

### Prerequisites
- Node.js (v16+)
- Git
- VS Code (recommended)
- Modern web browser

### Setup Commands
```bash
# Clone repository
git clone https://github.com/Saishyam-master/airManiaRacing.git
cd airMania

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Structure
```
airMania/
├── index.html          # Main HTML file
├── main.js            # Game logic and Three.js setup
├── package.json       # Dependencies and scripts
├── .gitignore         # Git ignore rules
├── visuals/           # Visual assets and screenshots
└── docs/              # Project documentation
    ├── README.md      # Documentation index
    ├── DEVELOPMENT.md # Development workflow and progress
    └── CODERABBIT_QA.md # CodeRabbit review tracking
```

## 📝 Blog Documentation Notes

### Key Topics to Cover
1. **Project Setup & Architecture**
   - Three.js integration with Vite
   - Modern JavaScript modules
   - Development workflow setup

2. **Game Development Challenges**
   - 3D graphics programming
   - Physics simulation
   - Performance optimization

3. **Code Review Process**
   - Using CodeRabbit for automated reviews
   - Branch-based development
   - Continuous improvement

4. **Learning Outcomes**
   - WebGL and 3D programming concepts
   - Game development patterns
   - Professional development workflow

---

*Last updated: July 17, 2025*
*Next update: After implementing neon UI enhancements or merging advanced UI PR*

## 📋 Recent Development Activity

### Latest Commit (July 17, 2025)
**Commit Hash**: `e658833`  
**Branch**: `feature/advanced-ui-with-jet`  
**Status**: ✅ Complete - Ready for merge

**Changes Made:**
- ✅ Modern grid-based layout with 3D jet centerpiece
- ✅ Custom GLB model integration (airManiaJet.glb - 8.03 MB)
- ✅ Professional 3D lighting and animation system
- ✅ Loading indicators with fallback procedural jet
- ✅ Enhanced UI responsiveness and clean aesthetic

**Files Modified:**
- `index.html` (+306 lines) - Complete UI redesign
- `main.js` (+84 lines) - 3D jet display implementation
- `assets/models/README.md` - New model documentation
- `visuals/airManiaJet.glb` - Custom 3D jet model

**Pull Request**: [#4 - feat: implement advanced UI with 3D jet centerpiece](https://github.com/Saishyam-master/airManiaRacing/pull/4)

### CodeRabbit Review Results
**Overall Assessment**: ✅ Positive - Ready for merge  
**Issues Found**: 1 minor file path inconsistency  
**Enhancement Suggestions**: Comprehensive neon UI upgrade recommendations

**Next Steps:**
1. Consider merging current advanced UI PR
2. Plan neon enhancement implementation
3. Address file path consistency issue
4. Begin Phase 2 racing elements development

## 🎯 Collision Detection & Aircraft System Solutions

### Aircraft System Architecture
- **AircraftSystem Class**: Complete flight physics and GLB model integration
- **Corner Spawn**: Aircraft spawns at terrain corner for racing-style start
- **Real-time Metrics**: Speed, altitude, throttle, engine status tracking
- **Crash Detection**: Terrain collision with safety margins

### Collision Detection Options

#### Option 1: Simple but Effective Collision Detection
```javascript
// Add this to your environment.js
class CollisionSystem {
    constructor(environment) {
        this.environment = environment;
        this.raycaster = new THREE.Raycaster();
    }

    checkAircraftCollision(aircraft) {
        // Get aircraft bounding box
        const aircraftBox = new THREE.Box3().setFromObject(aircraft);
        const minY = aircraftBox.min.y;
        
        // Check terrain height at aircraft position
        const terrainHeight = this.environment.getTerrainHeightAt(
            aircraft.position.x, 
            aircraft.position.z
        );
        
        // Add safety margin
        const safetyMargin = 10;
        const collisionThreshold = terrainHeight + safetyMargin;
        
        if (minY <= collisionThreshold) {
            return {
                collision: true,
                terrainHeight: terrainHeight,
                aircraftHeight: minY,
                penetration: collisionThreshold - minY
            };
        }
        
        return { collision: false };
    }

    // More accurate collision using multiple points
    checkDetailedCollision(aircraft) {
        const aircraftBox = new THREE.Box3().setFromObject(aircraft);
        
        // Test multiple points around aircraft
        const testPoints = [
            aircraft.position.clone(),
            new THREE.Vector3(aircraftBox.min.x, aircraftBox.min.y, aircraft.position.z),
            new THREE.Vector3(aircraftBox.max.x, aircraftBox.min.y, aircraft.position.z),
            new THREE.Vector3(aircraft.position.x, aircraftBox.min.y, aircraftBox.min.z),
            new THREE.Vector3(aircraft.position.x, aircraftBox.min.y, aircraftBox.max.z)
        ];

        for (let point of testPoints) {
            const terrainHeight = this.environment.getTerrainHeightAt(point.x, point.z);
            if (point.y <= terrainHeight + 5) { // 5 unit safety margin
                return {
                    collision: true,
                    point: point,
                    terrainHeight: terrainHeight,
                    aircraftHeight: point.y
                };
            }
        }
        
        return { collision: false };
    }
}
```

#### Option 2: Physics Engine Integration (Recommended)
```bash
# Add this to your project
npm install cannon-es
```

```javascript
import * as CANNON from 'cannon-es';

class PhysicsManager {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
        this.terrainBody = null;
        this.aircraftBody = null;
    }

    createTerrainPhysics(terrain) {
        // Create physics body from terrain mesh
        const geometry = terrain.geometry;
        const vertices = [];
        const indices = [];
        
        // Extract vertices
        const posArray = geometry.attributes.position.array;
        for (let i = 0; i < posArray.length; i += 3) {
            vertices.push(new CANNON.Vec3(posArray[i], posArray[i + 1], posArray[i + 2]));
        }
        
        // Extract indices
        if (geometry.index) {
            const indexArray = geometry.index.array;
            for (let i = 0; i < indexArray.length; i += 3) {
                indices.push([indexArray[i], indexArray[i + 1], indexArray[i + 2]]);
            }
        }
        
        // Create trimesh shape
        const shape = new CANNON.Trimesh(vertices, indices);
        this.terrainBody = new CANNON.Body({ mass: 0 });
        this.terrainBody.addShape(shape);
        this.world.add(this.terrainBody);
    }

    createAircraftPhysics(aircraft) {
        // Create physics body for aircraft
        const shape = new CANNON.Box(new CANNON.Vec3(6, 2, 2));
        this.aircraftBody = new CANNON.Body({ mass: 1 });
        this.aircraftBody.addShape(shape);
        this.aircraftBody.position.copy(aircraft.position);
        
        // Add collision event listener
        this.aircraftBody.addEventListener('collide', (event) => {
            this.handleCollision(event);
        });
        
        this.world.add(this.aircraftBody);
    }

    handleCollision(event) {
        console.log('Aircraft collision detected!');
        this.onCrash();
    }

    onCrash() {
        console.log('CRASH!');
        // Handle crash logic: stop game, show crash animation, etc.
    }

    update(deltaTime) {
        this.world.step(deltaTime);
        
        // Update Three.js objects from physics bodies
        if (this.aircraftBody && aircraft) {
            aircraft.position.copy(this.aircraftBody.position);
            aircraft.quaternion.copy(this.aircraftBody.quaternion);
        }
    }
}
```

### Sky Dome Fix
**Issue**: Sphere geometry creates visible globe artifact  
**Solution**: Use hemisphere with proper depth settings
- Changed to hemisphere geometry (half sphere)
- Increased radius from 2000 to 5000 units
- Added `depthWrite: false` and `renderOrder: -1`
- Adjusted gradient parameters for better sky appearance

### Current Implementation Status
- ✅ **Environment**: Fixed sky dome, added corner spawn positioning
- ✅ **Aircraft System**: GLB model loading, physics, metrics tracking
- ✅ **Main Integration**: Updated game loop to use aircraft system
- 🔄 **Collision**: Basic terrain collision implemented, physics engine ready for integration
- ⏳ **Racing Elements**: Awaiting collision system finalization
