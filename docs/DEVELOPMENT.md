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
*Next update: After implementing Trackmania-style racing track*
