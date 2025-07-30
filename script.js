document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION --- //
    const CONTROLS_CONFIG = {
    train: { slider: document.getElementById('train-slider'), progress: document.getElementById('train-progress'), config: { min: 2, max: 8, weight: 0.4, step: 1, curveType: 'ease-out-cubic' } },
    interval: { slider: document.getElementById('interval-slider'), progress: document.getElementById('interval-progress'), config: { min: 2, max: 8, weight: 0.3, inverse: true, step: 1, curveType: 'ease-in-cubic', chartGoesDown: true } },
    stopTime: { slider: document.getElementById('stop-time-slider'), progress: document.getElementById('stop-time-progress'), config: { min: 2, max: 5, weight: 0.15, inverse: false, step: 0.5, curveType: 'ease-in-out-sine' } },
    speed: { slider: document.getElementById('speed-slider'), progress: document.getElementById('speed-progress'), config: { min: 80, max: 100, weight: 0.15, step: 5, inverse: true, curveType: 'ease-out-cubic' } }
};

    const UI_ELEMENTS = {
        pressureIndicator: document.getElementById('total-pressure-indicator'),
        satisfactionEmoji: document.getElementById('satisfaction-emoji'),
        efficiencyStatus: document.getElementById('efficiency-status'),
        loadStatus: document.getElementById('load-status'),
        contributionChart: document.getElementById('contribution-chart'),
        lineContainer: document.getElementById('line-container'),
        automationChart: document.getElementById('automation-chart')
    };

    const LINE_CONFIG = {
        stations: 5,
        stationNames: ['中心站', '博览中心', '世纪城', '金融城', '孵化园']
    };

    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

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
            // pressure: 1 = high pressure (red), 0 = low pressure (green)
            const pressureRatio = Math.min(pressure, 1);
            
            // Base hue from pressure: Green (120) when idle to Red (0) when busy
            const baseHue = 120 * (1 - pressureRatio);
            
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
            this.throttledUpdateDashboard = throttle(this.updateDashboard.bind(this), 50);
        }

        init() {
            for (const key in this.controls) {
                this.controls[key].slider.addEventListener('input', () => this.updateDashboard());
            }
            this.initAutomationChart();

            this.setInitialDifficulty();
            this.updateDashboard();
            this.nextTrainTime = 5; // First train arrives in 5 seconds
            requestAnimationFrame(this.gameLoop.bind(this));
        }

        initAutomationChart() {
            const ctx = this.ui.automationChart.getContext('2d');
            const labels = Array.from({ length: 101 }, (_, i) => i);

            const draggableLine = {
                id: 'draggableLine',
                afterDraw: (chart) => {
                    console.log('afterDraw called'); // Debug log
                    if (chart.options.plugins.draggableLine && chart.options.plugins.draggableLine.enabled) {
                        const ctx = chart.ctx;
                        const xAxis = chart.scales.x;
                        const yAxis = chart.scales.y;
                        const value = chart.options.plugins.draggableLine.value;
                        const x = xAxis.getPixelForValue(value);
                        console.log(`Drawing line at x: ${x}, value: ${value}`); // Debug log

                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(x, yAxis.top);
                        ctx.lineTo(x, yAxis.bottom);
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = 'rgba(255, 99, 132, 1)';
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            };

            this.automationChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '列车数量',
                            data: labels.map(val => this.calculateAutomationValue(val, this.controls.train.config.min, this.controls.train.config.max, 'ease-out-cubic')),
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 2,
                            fill: false,
                            pointRadius: 0,
                        },
                        {
                            label: '发车间隔 (秒)',
                            data: labels.map(val => this.calculateAutomationValue(val, this.controls.interval.config.max, this.controls.interval.config.min, 'ease-in-cubic')),
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 2,
                            fill: false,
                            pointRadius: 0,
                        },
                        {
                            label: '停站时间 (秒)',
                            data: labels.map(val => this.calculateAutomationValue(val, this.controls.stopTime.config.min, this.controls.stopTime.config.max, 'ease-in-out-sine')),
                            borderColor: 'rgba(255, 206, 86, 1)',
                            borderWidth: 2,
                            fill: false,
                            pointRadius: 0,
                        },
                        {
                            label: '列车速度 (km/h)',
                            data: labels.map(val => this.calculateAutomationValue(val, this.controls.speed.config.min, this.controls.speed.config.max, 'ease-out-cubic')),
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 2,
                            fill: false,
                            pointRadius: 0,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    elements: {
                        line: {
                            tension: 0.4
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                        },
                        draggableLine: {
                            enabled: true,
                            value: 50 // Initial position of the line
                        }
                    }
                },
                plugins: [draggableLine]
            });

            let isDragging = false;

            this.ui.automationChart.addEventListener('mousedown', (e) => {
                const chart = this.automationChart;
                if (!chart.options.plugins.draggableLine) return;
                const xAxis = chart.scales.x;
                const value = chart.options.plugins.draggableLine.value;
                const x = xAxis.getPixelForValue(value);
                const rect = this.ui.automationChart.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const distance = Math.abs(mouseX - x);

                console.log(`Mousedown: mouseX=${mouseX}, lineX=${x}, distance=${distance}`);

                if (distance < 10) { // 10px tolerance
                    isDragging = true;
                    console.log('Dragging started');
                }
            });

            this.ui.automationChart.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    const chart = this.automationChart;
                    if (!chart.options.plugins.draggableLine) return;
                    const rect = this.ui.automationChart.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const xAxis = chart.scales.x;
                    const newValue = xAxis.getValueForPixel(mouseX);
                    
                    const clampedValue = Math.max(0, Math.min(100, newValue));
                    console.log(`Dragging: mouseX=${mouseX}, newValue=${clampedValue}`);
                    chart.options.plugins.draggableLine.value = clampedValue;
                    chart.update('none'); // Use 'none' to prevent animations
                }
            });

            const stopDragging = (e) => {
                if (isDragging) {
                    isDragging = false;
                    console.log('Dragging stopped');
                    const chart = this.automationChart;
                    if (!chart.options.plugins.draggableLine) return;
                    const rect = this.ui.automationChart.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const xAxis = chart.scales.x;
                    const newValue = xAxis.getValueForPixel(mouseX);
                    const clampedValue = Math.max(0, Math.min(100, newValue));
                    this.updateAutomation(clampedValue);
                }
            };

            this.ui.automationChart.addEventListener('mouseup', stopDragging);
            this.ui.automationChart.addEventListener('mouseleave', stopDragging);

            this.initPressureIndicatorInteraction();
        }

        initPressureIndicatorInteraction() {
            const indicator = this.ui.pressureIndicator;
            const pressureBar = indicator.parentElement;
            let isDraggingPressure = false;
            let animationFrameId = null;

            const updatePressure = (x) => {
                const rect = pressureBar.getBoundingClientRect();
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                indicator.style.left = `${percentage}%`;
                const weightedAverageRelief = 1 - (percentage / 100);
                this.updateControlsFromPressure(weightedAverageRelief);
            };

            indicator.addEventListener('mousedown', (e) => {
                isDraggingPressure = true;
                indicator.style.cursor = 'grabbing';
                document.body.style.cursor = 'grabbing';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDraggingPressure) return;
                const rect = pressureBar.getBoundingClientRect();
                const newX = e.clientX - rect.left;
                
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                animationFrameId = requestAnimationFrame(() => updatePressure(newX));
            });

            document.addEventListener('mouseup', () => {
                if (isDraggingPressure) {
                    isDraggingPressure = false;
                    indicator.style.cursor = 'grab';
                    document.body.style.cursor = 'default';
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                }
            });
        }

        updateControlsFromPressure(relief) {
            let automationValue;

            for (const key in this.controls) {
                const { slider, config } = this.controls[key];
                const { min, max, inverse } = config;
                const valueElement = document.getElementById(`${key}-value`);
                
                let targetRelief = relief;
                let targetValue;

                if (inverse) {
                    targetValue = min + (1 - targetRelief) * (max - min);
                } else {
                    targetValue = min + targetRelief * (max - min);
                }

                slider.value = targetValue;
                if (valueElement) {
                    valueElement.textContent = targetValue.toFixed(key === 'stopTime' ? 1 : 0);
                }

                if (key === 'train') { // Use a consistent control to derive the master value
                     const normalizedSliderValue = (targetValue - min) / (max - min);
                     const valueForInverseEasing = config.chartGoesDown ? 1 - normalizedSliderValue : normalizedSliderValue;
                     let masterNorm;
                     switch (config.curveType) {
                         case 'ease-in-out-sine':
                             masterNorm = Math.acos(1 - 2 * valueForInverseEasing) / Math.PI;
                             break;
                         case 'ease-out-cubic':
                             masterNorm = 1 - Math.pow(1 - valueForInverseEasing, 1/3);
                             break;
                         case 'ease-in-cubic':
                             masterNorm = Math.pow(valueForInverseEasing, 1/3);
                             break;
                         default: // linear
                             masterNorm = valueForInverseEasing;
                             break;
                     }
                     automationValue = masterNorm * 100;
                }
            }
            
            if (this.automationChart && this.automationChart.options.plugins.draggableLine) {
                this.automationChart.options.plugins.draggableLine.value = automationValue;
                this.automationChart.update('none');
            }

            this.throttledUpdateDashboard();
        }
    
        calculateAutomationValue(value, min, max, curveType = 'linear') {
            const masterValue = value / 100;
            let easedValue;

            switch (curveType) {
                case 'ease-in-out-sine':
                    easedValue = -(Math.cos(Math.PI * masterValue) - 1) / 2;
                    break;
                case 'ease-out-cubic':
                    easedValue = 1 - Math.pow(1 - masterValue, 3);
                    break;
                case 'ease-in-cubic':
                    easedValue = Math.pow(masterValue, 3);
                    break;
                case 'linear':
                default:
                    easedValue = masterValue;
                    break;
            }
            return min + easedValue * (max - min);
        }

        updateAutomation(value, skipKey = null) {
            if (skipKey !== 'train') {
                const trainValue = this.calculateAutomationValue(value, this.controls.train.config.min, this.controls.train.config.max, 'ease-out-cubic');
                this.controls.train.slider.value = trainValue;
                document.getElementById('train-value').textContent = Math.round(trainValue);
            }

            if (skipKey !== 'interval') {
                const intervalValue = this.calculateAutomationValue(value, this.controls.interval.config.max, this.controls.interval.config.min, 'ease-in-cubic');
                this.controls.interval.slider.value = intervalValue;
                document.getElementById('interval-value').textContent = Math.round(intervalValue);
            }

            if (skipKey !== 'stopTime') {
                const stopTimeValue = this.calculateAutomationValue(value, this.controls.stopTime.config.min, this.controls.stopTime.config.max, 'ease-in-out-sine');
                this.controls.stopTime.slider.value = stopTimeValue;
                document.getElementById('stopTime-value').textContent = stopTimeValue.toFixed(1);
            }

            if (skipKey !== 'speed') {
                const speedValue = this.calculateAutomationValue(value, this.controls.speed.config.min, this.controls.speed.config.max, 'ease-out-cubic');
                this.controls.speed.slider.value = speedValue;
                document.getElementById('speed-value').textContent = Math.round(speedValue);
            }

            this.updateDashboard();
        }

        setInitialDifficulty() {
            this.controls.train.slider.value = this.controls.train.config.min;
            this.controls.interval.slider.value = this.controls.interval.config.max;
            this.controls.stopTime.slider.value = this.controls.stopTime.config.min;
            this.controls.speed.slider.value = this.controls.speed.config.min;
            document.getElementById('speed-value').textContent = this.controls.speed.slider.value;

        // Add event listeners for bi-directional updates
        for (const key in this.controls) {
            const { slider, config } = this.controls[key];
            const valueElement = document.getElementById(`${key}-value`) || document.getElementById(`${config.id}-value`);

            if (valueElement) {
                slider.addEventListener('input', (event) => {
                    const value = parseFloat(event.target.value);
                    valueElement.textContent = value.toFixed(key === 'stopTime' ? 1 : 0);
                    this.updateAutomationFromSlider(key, value);
                });
                valueElement.textContent = slider.value;
            }
        }
        }

        updateAutomationFromSlider(sourceKey, sourceValue) {
            // Decouple sliders: moving one slider only updates the dashboard metrics
            // and does not affect any other sliders.
            this.throttledUpdateDashboard();
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
                
                // Update progress bar color based on relief: green (idle) to red (busy)
                // relief: 1 = high relief (green), 0 = low relief (red)
                const hue = 120 * relief; // Green (120) to Red (0)
                progress.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
                
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
            
            // The background is now a gradient, so we only need to update the indicator's position.
            // The color logic for the indicator itself is removed.
            
            console.log(`Updating pressure indicator left to: ${pressurePercentage}%`); // Debugging log

            const satisfactionScore = Math.round(weightedAverageRelief * 100);
            const satisfactionScoreElement = document.getElementById('satisfaction-score');
            if (satisfactionScoreElement) {
                satisfactionScoreElement.textContent = `${satisfactionScore}`;
            }

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
            const getBarId = (key) => `${key.replace('stopTime', 'stop-time')}-contrib`;
            
            // 当客流压力最弱时（各措施设为最小值），贡献度应该最大
            // 使用1-relief来计算贡献度，这样当relief为0时贡献度最大
            const totalContribution = Object.values(state).reduce((sum, { relief, weight }) => sum + (1 - relief) * weight, 0);

            if (totalContribution > 0) {
                for (const key in state) {
                    const { relief, weight } = state[key];
                    const contribution = ((1 - relief) * weight) / totalContribution;
                    const bar = document.getElementById(getBarId(key));
                    if (bar) {
                        bar.style.width = `${contribution * 100}%`;
                    }
                }
            } else {
                // 当totalContribution为0时，平均分配贡献度
                const keys = Object.keys(state);
                const avgContribution = 100 / keys.length;
                for (const key in state) {
                    const bar = document.getElementById(getBarId(key));
                    if (bar) {
                        bar.style.width = `${avgContribution}%`;
                    }
                }
            }
        }
    }

    // --- INITIALIZATION --- //
    const simulation = new Simulation(CONTROLS_CONFIG, UI_ELEMENTS, LINE_CONFIG);
    simulation.init();
});