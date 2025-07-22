// Racing UI System - Displays race progress, timing, and aircraft metrics
class RacingUI {
    constructor() {
        this.container = null;
        this.elements = {};
        this.isVisible = false;
        this.raceManager = null;
        this.aircraftSystem = null;
        
        this.init();
    }
    
    init() {
        this.createUIContainer();
        this.createHUD();
        this.setupEventListeners();
    }
    
    createUIContainer() {
        this.container = document.createElement('div');
        this.container.id = 'racing-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
            font-family: 'Orbitron', monospace;
            color: #00ffff;
        `;
        document.body.appendChild(this.container);
    }
    
    createHUD() {
        // Top race info bar
        const raceInfo = document.createElement('div');
        raceInfo.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 255, 255, 0.1);
            border: 2px solid #00ffff;
            border-radius: 10px;
            padding: 15px 30px;
            text-align: center;
            backdrop-filter: blur(10px);
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        `;
        
        raceInfo.innerHTML = `
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">
                LAP <span id="current-lap">1</span> / <span id="total-laps">3</span>
            </div>
            <div style="font-size: 18px;">
                TIME: <span id="current-time">00:00.000</span>
            </div>
        `;
        
        this.container.appendChild(raceInfo);
        this.elements.raceInfo = raceInfo;
        this.elements.currentLap = document.getElementById('current-lap');
        this.elements.totalLaps = document.getElementById('total-laps');
        this.elements.currentTime = document.getElementById('current-time');
        
        // Left side - Aircraft metrics
        const aircraftMetrics = document.createElement('div');
        aircraftMetrics.style.cssText = `
            position: absolute;
            top: 120px;
            left: 20px;
            background: rgba(255, 0, 255, 0.1);
            border: 2px solid #ff00ff;
            border-radius: 10px;
            padding: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
            min-width: 200px;
        `;
        
        aircraftMetrics.innerHTML = `
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #ff00ff;">
                AIRCRAFT
            </div>
            <div style="margin-bottom: 8px;">
                SPEED: <span id="aircraft-speed">0</span> km/h
            </div>
            <div style="margin-bottom: 8px;">
                ALTITUDE: <span id="aircraft-altitude">0</span> m
            </div>
            <div style="margin-bottom: 8px;">
                THROTTLE: <span id="aircraft-throttle">0</span>%
            </div>
            <div>
                NEXT: <span id="next-checkpoint">Checkpoint 1</span>
            </div>
        `;
        
        this.container.appendChild(aircraftMetrics);
        this.elements.aircraftMetrics = aircraftMetrics;
        this.elements.aircraftSpeed = document.getElementById('aircraft-speed');
        this.elements.aircraftAltitude = document.getElementById('aircraft-altitude');
        this.elements.aircraftThrottle = document.getElementById('aircraft-throttle');
        this.elements.nextCheckpoint = document.getElementById('next-checkpoint');
        
        // Right side - Race progress
        const raceProgress = document.createElement('div');
        raceProgress.style.cssText = `
            position: absolute;
            top: 120px;
            right: 20px;
            background: rgba(0, 255, 255, 0.1);
            border: 2px solid #00ffff;
            border-radius: 10px;
            padding: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
            min-width: 200px;
        `;
        
        raceProgress.innerHTML = `
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px;">
                PROGRESS
            </div>
            <div style="margin-bottom: 8px;">
                CHECKPOINTS: <span id="checkpoints-progress">0/6</span>
            </div>
            <div style="margin-bottom: 8px;">
                CURRENT LAP: <span id="lap-time">00:00.000</span>
            </div>
            <div style="margin-bottom: 8px;">
                BEST LAP: <span id="best-lap">--:--.---</span>
            </div>
            <div>
                TOTAL TIME: <span id="total-time">00:00.000</span>
            </div>
        `;
        
        this.container.appendChild(raceProgress);
        this.elements.raceProgress = raceProgress;
        this.elements.checkpointsProgress = document.getElementById('checkpoints-progress');
        this.elements.lapTime = document.getElementById('lap-time');
        this.elements.bestLap = document.getElementById('best-lap');
        this.elements.totalTime = document.getElementById('total-time');
        
        // Center bottom - Speed indicator
        const speedIndicator = document.createElement('div');
        speedIndicator.style.cssText = `
            position: absolute;
            bottom: 50px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 255, 255, 0.2);
            border: 3px solid #00ffff;
            border-radius: 50px;
            padding: 10px 30px;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            backdrop-filter: blur(10px);
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        `;
        
        speedIndicator.innerHTML = `
            <span id="speed-display">0</span> km/h
        `;
        
        this.container.appendChild(speedIndicator);
        this.elements.speedIndicator = speedIndicator;
        this.elements.speedDisplay = document.getElementById('speed-display');
        
        // Race status messages
        const statusMessage = document.createElement('div');
        statusMessage.id = 'status-message';
        statusMessage.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 0, 0.2);
            border: 3px solid #00ff00;
            border-radius: 15px;
            padding: 20px 40px;
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            backdrop-filter: blur(15px);
            box-shadow: 0 0 40px rgba(0, 255, 0, 0.6);
            display: none;
            z-index: 1001;
        `;
        
        this.container.appendChild(statusMessage);
        this.elements.statusMessage = statusMessage;
    }
    
    setRaceManager(raceManager) {
        this.raceManager = raceManager;
        
        // Listen to race events
        this.raceManager.on('checkpoint', (data) => {
            this.showMessage(`CHECKPOINT ${data.index + 1}!`, 2000, '#00ff00');
            this.updateProgress();
        });
        
        this.raceManager.on('lapComplete', (data) => {
            const lapTimeStr = this.formatTime(data.lapTime);
            this.showMessage(`LAP COMPLETE!<br>Time: ${lapTimeStr}`, 3000, '#ffff00');
            this.updateProgress();
        });
        
        this.raceManager.on('raceComplete', (data) => {
            const totalTimeStr = this.formatTime(data.totalTime);
            const bestLapStr = this.formatTime(data.bestLapTime);
            this.showMessage(`RACE COMPLETE!<br>Total: ${totalTimeStr}<br>Best Lap: ${bestLapStr}`, 5000, '#ff00ff');
        });
        
        this.raceManager.on('crash', () => {
            this.showMessage('CRASHED! RESPAWNING...', 2000, '#ff0000');
        });
    }
    
    setAircraftSystem(aircraftSystem) {
        this.aircraftSystem = aircraftSystem;
    }
    
    update() {
        if (!this.isVisible) return;
        
        // Update aircraft metrics
        if (this.aircraftSystem) {
            const speed = this.aircraftSystem.velocity.length() * 3.6; // Convert to km/h
            const altitude = Math.round(this.aircraftSystem.aircraft.position.y);
            const throttle = Math.round(this.aircraftSystem.currentThrottle * 100);
            
            this.elements.aircraftSpeed.textContent = Math.round(speed);
            this.elements.aircraftAltitude.textContent = altitude;
            this.elements.aircraftThrottle.textContent = throttle;
            this.elements.speedDisplay.textContent = Math.round(speed);
        }
        
        // Update race timing
        if (this.raceManager && this.raceManager.isRacing) {
            const currentTime = this.raceManager.getCurrentTime();
            const totalTime = this.raceManager.getTotalTime();
            const progress = this.raceManager.getProgress();
            
            this.elements.currentTime.textContent = this.formatTime(currentTime);
            this.elements.lapTime.textContent = this.formatTime(currentTime);
            this.elements.totalTime.textContent = this.formatTime(totalTime);
            
            this.elements.currentLap.textContent = progress.lap;
            this.elements.totalLaps.textContent = progress.totalLaps;
            this.elements.checkpointsProgress.textContent = `${progress.checkpoints}/${progress.totalCheckpoints}`;
            
            this.elements.nextCheckpoint.textContent = `Checkpoint ${progress.nextCheckpoint + 1}`;
            
            if (this.raceManager.bestLapTime) {
                this.elements.bestLap.textContent = this.formatTime(this.raceManager.bestLapTime);
            }
        }
    }
    
    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
    }
    
    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
    }
    
    showMessage(message, duration = 3000, color = '#00ff00') {
        const messageEl = this.elements.statusMessage;
        messageEl.innerHTML = message;
        messageEl.style.borderColor = color;
        messageEl.style.color = color;
        messageEl.style.boxShadow = `0 0 40px ${color}66`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, duration);
    }
    
    updateProgress() {
        if (!this.raceManager) return;
        
        const progress = this.raceManager.getProgress();
        this.elements.checkpointsProgress.textContent = `${progress.checkpoints}/${progress.totalCheckpoints}`;
        this.elements.nextCheckpoint.textContent = `Checkpoint ${progress.nextCheckpoint + 1}`;
    }
    
    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        const ms = Math.floor((milliseconds % 1000) / 10);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}0`;
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            // Responsive adjustments if needed
        });
        
        // Keyboard shortcuts for UI
        document.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'KeyH':
                    this.toggleVisibility();
                    break;
                case 'KeyR':
                    if (this.raceManager && !this.raceManager.isRacing) {
                        this.raceManager.startRace();
                    }
                    break;
            }
        });
    }
    
    toggleVisibility() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Create and export UI instance
const racingUI = new RacingUI();

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RacingUI, racingUI };
} else {
    window.RacingUI = RacingUI;
    window.racingUI = racingUI;
}
