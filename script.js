document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION --- //
    const CONTROLS_CONFIG = {
    train: { slider: document.getElementById('train-slider'), progress: document.getElementById('train-progress'), config: { min: 2, max: 8, weight: 0.4, step: 1 } },
    interval: { slider: document.getElementById('interval-slider'), progress: document.getElementById('interval-progress'), config: { min: 2, max: 8, weight: 0.3, inverse: true, step: 1 } },
    stopTime: { slider: document.getElementById('stop-time-slider'), progress: document.getElementById('stop-time-progress'), config: { min: 2, max: 5, weight: 0.15, inverse: false, step: 0.5 } },
    speed: { slider: document.getElementById('speed-slider'), progress: document.getElementById('speed-progress'), config: { min: 80, max: 100, weight: 0.15, step: 5, inverse: true } }
};

    const UI_ELEMENTS = {
        pressureIndicator: document.getElementById('total-pressure-indicator'),
        satisfactionEmoji: document.getElementById('satisfaction-emoji'),
        efficiencyStatus: document.getElementById('efficiency-status'),
        loadStatus: document.getElementById('load-status'),
        contributionChart: document.getElementById('contribution-chart'),
        lineContainer: document.getElementById('line-container')
    };

    const LINE_CONFIG = {
        stations: 5,
        stationNames: ['中心站', '博览中心', '世纪城', '金融城', '孵化园']
    };

    // --- CLASSES --- //

    class Train {
        constructor(id, container) {
            this.id = id;
            this.element = document.createElement('div');
            this.element.className = 'train';
            this.element.id = `train-${id}`;
            this.element.textContent = `T${id}`;
            container.appendChild(this.element);
            this.position = -50; // Start off-screen
            this.element.style.left = `${this.position}px`;
        }

        moveTo(position, duration) {
            return new Promise(resolve => {
                this.element.style.transition = `left ${duration}s linear`;
                this.element.style.left = `${position}px`;
                setTimeout(resolve, duration * 1000);
            });
        }

        remove() {
            this.element.remove();
        }
    }

    class MetroLine {
        constructor(ui, lineConfig) {
            this.ui = ui;
            this.config = lineConfig;
            this.stations = [];
            this.trains = new Map();
            this.trainCounter = 0;
            this.lineLength = this.ui.lineContainer.offsetWidth;
            this.isFirstStationOccupied = false;

            this.setupLine();
        }

        setupLine() {
            this.ui.lineContainer.innerHTML = ''; // Clear previous setup
            const track = document.createElement('div');
            track.className = 'line-track';
            this.ui.lineContainer.appendChild(track);

            for (let i = 0; i < this.config.stations; i++) {
                const stationElement = document.createElement('div');
                stationElement.className = 'station-node';
                
                const stationName = document.createElement('div');
                stationName.className = 'station-name';
                stationName.textContent = this.config.stationNames[i] || `Station ${i + 1}`;
                stationElement.appendChild(stationName);

                this.ui.lineContainer.appendChild(stationElement);
                this.stations.push({ element: stationElement, load: 0, isOccupied: false });
            }
        }

        simulatePassengerFlow(pressure, deltaTime) {
            const baseArrival = 5; // passengers per second per station
            const pressureFactor = 1 + pressure * 4; // Increased pressure sensitivity
            const arrivals = baseArrival * pressureFactor * deltaTime;
            const decayFactor = 0.1; // 90% decay per second

            this.stations.forEach(station => {
                station.load *= Math.pow(decayFactor, deltaTime); // Decay load over time
                station.load += arrivals * (0.8 + Math.random() * 0.4); // Add new arrivals
                this.updateStationAppearance(station, pressure);
            });
        }

        updateStationAppearance(station, pressure) {
            const load = station.load;
            const maxLoad = 200; // Define a maximum load for scaling
            const loadRatio = Math.min(load / maxLoad, 1);

            // Use pressure to determine base color, then modify by load
            // pressure: 1 = no relief (red), 0 = full relief (light blue)
            const pressureRatio = Math.min(pressure, 1);
            
            // Base hue from pressure: Blue (240) to Red (0)
            const baseHue = 240 * (1 - pressureRatio);
            
            // Adjust lightness based on load: higher load = darker
            const lightness = 80 - (loadRatio * 30); // 80% to 50%
            const saturation = 70 + (pressureRatio * 30); // 70% to 100%

            station.element.style.backgroundColor = `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
        }

        async runTrain(controls, pressure) {
            this.trainCounter++;
            const trainId = this.trainCounter;
            const train = new Train(trainId, this.ui.lineContainer);
            this.trains.set(trainId, train);

            const speed = parseFloat(controls.speed.slider.value);
            const stopTimeValue = parseFloat(controls.stopTime.slider.value);
            const capacity = 250; // Fixed capacity per train

            const stationPositions = this.stations.map(s => s.element.offsetLeft + s.element.offsetWidth / 2);

            for (let i = 0; i < stationPositions.length; i++) {
                const station = this.stations[i];
                const nextStation = this.stations[i + 1];

                // Block section logic
                while (station.isOccupied || (nextStation && nextStation.isOccupied)) {
                    await new Promise(resolve => setTimeout(resolve, 100)); // Wait if the current or next station is occupied
                }
                station.isOccupied = true;
                if (i > 0) {
                    this.stations[i - 1].isOccupied = false; // Free the previous station
                }

                const position = stationPositions[i];
                const distance = position - train.position;
                const travelTime = (distance / speed) * 20; // Adjust factor for visual speed

                await train.moveTo(position, travelTime);
                train.position = position;

                // Simulate passenger exchange based on stop time
                const exchangeRate = 20; // passengers per second
                const maxExchange = exchangeRate * stopTimeValue;
                const boarded = Math.min(station.load, capacity, maxExchange);
                station.load -= boarded;
                this.updateStationAppearance(station, pressure);

                await new Promise(resolve => setTimeout(resolve, stopTimeValue * 100));
            }

            // Free the last station
            if (this.stations.length > 0) {
                this.stations[this.stations.length - 1].isOccupied = false;
            }

            // Final departure off-screen
            const finalPosition = this.lineLength + 100;
            const finalDistance = finalPosition - train.position;
            const finalTravelTime = (finalDistance / speed) * 20;
            await train.moveTo(finalPosition, finalTravelTime);

            this.trains.delete(trainId);
            train.remove();
        }
    }

    class Simulation {
        constructor(controls, ui, lineConfig) {
            this.controls = controls;
            this.ui = ui;
            this.metroLine = new MetroLine(ui, lineConfig);
            this.isRunning = true;
            this.lastUpdateTime = performance.now();
            this.nextTrainTime = 0;
            this.pressure = 0.5;
        }

        init() {
            for (const key in this.controls) {
                this.controls[key].slider.addEventListener('input', () => this.updateDashboard());
            }
            this.setInitialDifficulty();
            this.updateDashboard();
            this.nextTrainTime = 5; // First train arrives in 5 seconds
            requestAnimationFrame(this.gameLoop.bind(this));
        }

        setInitialDifficulty() {
            this.controls.train.slider.value = this.controls.train.config.min;
            this.controls.interval.slider.value = this.controls.interval.config.max;
            this.controls.stopTime.slider.value = this.controls.stopTime.config.min;
            this.controls.speed.slider.value = this.controls.speed.config.min;

        // Add event listeners to update the value displays in real-time
        for (const key in this.controls) {
            const { slider } = this.controls[key];
            const valueElement = document.getElementById(`${key}-value`);
            if (valueElement) {
                // Update the value display in real-time
                slider.addEventListener('input', (event) => {
                    valueElement.textContent = event.target.value;
                });
                // Set initial value display
                valueElement.textContent = slider.value;
            }
        }
        }

        gameLoop(timestamp) {
            if (!this.isRunning) return;

            const deltaTime = (timestamp - this.lastUpdateTime) / 1000;
            this.lastUpdateTime = timestamp;

            // Only update passenger count when no train is being dispatched
            this.metroLine.simulatePassengerFlow(this.pressure, deltaTime);

            // Update dashboard
            this.updateDashboard();

            // Dispatch trains
            this.nextTrainTime -= deltaTime;
            if (this.nextTrainTime <= 0 && this.metroLine.trains.size < this.controls.train.slider.value && !this.metroLine.stations[0].isOccupied) {
                this.metroLine.runTrain(this.controls, this.pressure);
                this.resetTrainTimer();
            }

            requestAnimationFrame(this.gameLoop.bind(this));
        }



        resetTrainTimer() {
            const interval = parseFloat(this.controls.interval.slider.value);
            this.nextTrainTime = interval * 2; // Convert to very fast demo timing for high frequency
        }

        updateDashboard() {
            const state = {};
            let totalRelief = 0;
            let totalWeight = 0;

            for (const key in this.controls) {
                const { slider, progress, config } = this.controls[key];
                const value = parseFloat(slider.value);
                const relief = this.calculateRelief(value, config.min, config.max, config.inverse);
                state[key] = { relief, weight: config.weight };
                progress.style.width = `${relief * 100}%`;
                totalRelief += relief * config.weight;
                totalWeight += config.weight;
            }

            const targetTrainCount = parseInt(this.controls.train.slider.value, 10);
            while (this.metroLine.trains.size > targetTrainCount) {
                const lastTrainId = Math.max(...this.metroLine.trains.keys());
                const trainToRemove = this.metroLine.trains.get(lastTrainId);
                if (trainToRemove) {
                    trainToRemove.remove();
                    this.metroLine.trains.delete(lastTrainId);
                } else {
                    break;
                }
            }

            const weightedAverageRelief = totalWeight > 0 ? totalRelief / totalWeight : 0;
            this.pressure = 1 - weightedAverageRelief;
            this.updateSummaryUI(weightedAverageRelief, state);
        }

        calculateRelief(value, min, max, inverse = false) {
            const range = max - min;
            if (range === 0) return 0.5;
            const percentage = (value - min) / range;
            return inverse ? 1 - percentage : percentage;
        }

        updateSummaryUI(weightedAverageRelief, state) {
            const pressurePercentage = (1 - weightedAverageRelief) * 100;
            this.ui.pressureIndicator.style.left = `${pressurePercentage}%`;
            console.log(`Updating pressure indicator left to: ${pressurePercentage}%`); // Debugging log

            if (weightedAverageRelief > 0.75) this.ui.satisfactionEmoji.textContent = '😄';
            else if (weightedAverageRelief > 0.5) this.ui.satisfactionEmoji.textContent = '😊';
            else if (weightedAverageRelief > 0.25) this.ui.satisfactionEmoji.textContent = '😐';
            else this.ui.satisfactionEmoji.textContent = '😟';

            this.ui.efficiencyStatus.textContent = weightedAverageRelief > 0.6 ? '显著提升' : '提升中';
            this.ui.loadStatus.textContent = this.pressure < 0.5 ? '平稳可控' : '负荷较高';
            this.ui.loadStatus.style.backgroundColor = this.pressure < 0.5 ? 'var(--color-success)' : 'var(--color-danger)'; // Use danger for high load

            this.updateContributionChart(state);
        }

        updateContributionChart(state) {
            this.ui.contributionChart.innerHTML = '';
            const totalContribution = Object.values(state).reduce((sum, { relief, weight }) => sum + relief * weight, 0);
            if (totalContribution > 0) {
                for (const key in state) {
                    const { relief, weight } = state[key];
                    const contribution = (relief * weight) / totalContribution;
                    const bar = document.createElement('div');
                    bar.className = 'contribution-bar';
                    bar.id = `${key}-contrib`;
                    bar.style.width = `${contribution * 100}%`;
                    this.ui.contributionChart.appendChild(bar);
                }
            }
        }
    }

    // --- INITIALIZATION --- //
    const simulation = new Simulation(CONTROLS_CONFIG, UI_ELEMENTS, LINE_CONFIG);
    simulation.init();
});