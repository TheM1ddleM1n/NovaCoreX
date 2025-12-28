// ==UserScript==
// @name         NovaCore V3 Enhanced
// @namespace    http://github.com/TheM1ddleM1n/
// @version      3
// @description  NovaCore V2 with improved performance, memory management, code quality, themes, and session stats!
// @author       (Cant reveal who im), TheM1ddleM1n
// @match        https://miniblox.io/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ===== CONSTANTS =====
    const TIMING = {
        INTRO_CHECK_APPEAR: 900,
        INTRO_BUTTON_EXIT: 3200,
        INTRO_TEXT_START: 4000,
        INTRO_CHECKMARK_APPEAR: 6300,
        INTRO_TOTAL_DURATION: 7000,
        INTRO_FADE_OUT: 1000,
        HINT_TEXT_DURATION: 4000,
        FPS_UPDATE_INTERVAL: 1000,
        CPS_UPDATE_INTERVAL: 100,
        CPS_WINDOW: 1000,
        SAVE_DEBOUNCE: 500,
        STATS_UPDATE_INTERVAL: 1000
    };

    const THEMES = {
        cyan: {
            name: 'Cyan (Default)',
            primary: '#00ffff',
            primaryRgb: '0, 255, 255',
            shadow: '#00ffff'
        },
        purple: {
            name: 'Purple Dream',
            primary: '#9b59b6',
            primaryRgb: '155, 89, 182',
            shadow: '#9b59b6'
        },
        green: {
            name: 'Matrix Green',
            primary: '#2ecc71',
            primaryRgb: '46, 204, 113',
            shadow: '#2ecc71'
        },
        red: {
            name: 'Crimson Fire',
            primary: '#e74c3c',
            primaryRgb: '231, 76, 60',
            shadow: '#e74c3c'
        },
        blue: {
            name: 'Ocean Blue',
            primary: '#3498db',
            primaryRgb: '52, 152, 219',
            shadow: '#3498db'
        },
        gold: {
            name: 'Golden Glow',
            primary: '#f39c12',
            primaryRgb: '243, 156, 18',
            shadow: '#f39c12'
        },
        pink: {
            name: 'Bubblegum Pink',
            primary: '#ff69b4',
            primaryRgb: '255, 105, 180',
            shadow: '#ff69b4'
        },
        orange: {
            name: 'Sunset Orange',
            primary: '#ff6b35',
            primaryRgb: '255, 107, 53',
            shadow: '#ff6b35'
        },
        custom: {
            name: 'Custom',
            primary: '#00ffff',
            primaryRgb: '0, 255, 255',
            shadow: '#00ffff'
        }
    };

    const SETTINGS_KEY = 'novacore_settings';
    const DEFAULT_MENU_KEY = '\\';
    const SESSION_START_KEY = 'novacore_session_start';
    const SESSION_ID_KEY = 'novacore_session_id';
    const SESSION_STATS_KEY = 'novacore_session_stats';
    const SESSION_COUNT_KEY = 'novacore_session_count';
    const CUSTOM_COLOR_KEY = 'novacore_custom_color';
    const SCRIPT_VERSION = '3';
    const GITHUB_REPO = 'TheM1ddleM1n/NovaCoreForMiniblox';
    const LAST_UPDATE_CHECK_KEY = 'novacore_last_update_check';
    const UPDATE_CHECK_INTERVAL = 3600000;

    // ===== CIRCUIT BREAKER FOR ERROR RECOVERY =====
    const circuitBreaker = {
        failures: new Map(),
        threshold: 3,
        resetTime: 60000,

        record(context) {
            const count = (this.failures.get(context) || 0) + 1;
            this.failures.set(context, count);

            if (count >= this.threshold) {
                console.warn(`[NovaCore] Circuit breaker triggered for ${context}`);
                showErrorNotification(`${context} disabled due to repeated errors`);

                setTimeout(() => {
                    this.failures.delete(context);
                    console.log(`[NovaCore] Circuit breaker reset for ${context}`);
                }, this.resetTime);

                return true;
            }

            return false;
        },

        isOpen(context) {
            return (this.failures.get(context) || 0) >= this.threshold;
        }
    };

    // ===== STATE MANAGEMENT WITH PROXY =====
    const stateData = {
        fpsShown: false,
        cpsShown: false,
        realTimeShown: false,
        sessionTimerShown: false,
        antiAfkEnabled: false,
        menuKey: DEFAULT_MENU_KEY,
        currentTheme: 'cyan',
        counters: {
            fps: null,
            cps: null,
            realTime: null,
            sessionTimer: null,
            antiAfk: null
        },
        intervals: {
            fps: null,
            cps: null,
            realTime: null,
            sessionTimer: null,
            antiAfk: null,
            statsUpdate: null
        },
        drag: {
            fps: { active: false, offsetX: 0, offsetY: 0 },
            cps: { active: false, offsetX: 0, offsetY: 0 },
            realTime: { active: false, offsetX: 0, offsetY: 0 },
            sessionTimer: { active: false, offsetX: 0, offsetY: 0 },
            antiAfk: { active: false, offsetX: 0, offsetY: 0 }
        },
        cpsClicks: [],
        rafId: null,
        sessionStartTime: null,
        cleanupFunctions: {
            fps: null,
            cps: null,
            realTime: null,
            sessionTimer: null,
            antiAfk: null
        },
        updateAvailable: false,
        latestVersion: null,
        antiAfkCountdown: 5,
        performanceLoopRunning: false,
        activeRAFFeatures: new Set(),
        eventListeners: new Map(),
        sessionStats: {
            totalClicks: 0,
            totalKeys: 0,
            peakCPS: 0,
            peakFPS: 0,
            sessionCount: 0,
            startTime: null,
            clicksBySecond: [],
            fpsHistory: [],
            averageFPS: 0,
            averageCPS: 0,
            totalSessionTime: 0
        }
    };

    const cachedElements = {};
    let cpsClickListenerRef = null;

    // ===== UTILITY FUNCTIONS =====
    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 999999999;
            background: rgba(231, 76, 60, 0.95); color: white;
            padding: 12px 20px; border-radius: 8px;
            font-family: 'Segoe UI', sans-serif; font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.5s ease;
        `;
        notification.textContent = `⚠️ ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    function safeExecute(fn, fallbackValue = null, context = 'Unknown') {
        try {
            return fn();
        } catch (error) {
            console.error(`[NovaCore Error - ${context}]:`, error);

            if (circuitBreaker.record(context)) {
                return fallbackValue;
            }

            if (context.includes('Counter') || context.includes('Timer')) {
                showErrorNotification(`Feature temporarily unavailable: ${context}`);

                setTimeout(() => {
                    if (!circuitBreaker.isOpen(context)) {
                        console.log(`[NovaCore] Attempting to recover: ${context}`);
                        if (context.includes('FPS') && state.fpsShown) {
                            stopFPSCounter();
                            setTimeout(() => startFPSCounter(), 1000);
                        } else if (context.includes('CPS') && state.cpsShown) {
                            stopCPSCounter();
                            setTimeout(() => startCPSCounter(), 1000);
                        }
                    }
                }, 3000);
            }
            return fallbackValue;
        }
    }

    function saveSettings() {
        safeExecute(() => {
            const settings = {
                version: SCRIPT_VERSION,
                fpsShown: stateData.fpsShown,
                cpsShown: stateData.cpsShown,
                realTimeShown: stateData.realTimeShown,
                sessionTimerShown: stateData.sessionTimerShown,
                antiAfkEnabled: stateData.antiAfkEnabled,
                menuKey: stateData.menuKey,
                currentTheme: stateData.currentTheme,
                positions: {
                    fps: stateData.counters.fps ? {
                        left: stateData.counters.fps.style.left,
                        top: stateData.counters.fps.style.top
                    } : null,
                    cps: stateData.counters.cps ? {
                        left: stateData.counters.cps.style.left,
                        top: stateData.counters.cps.style.top
                    } : null,
                    realTime: stateData.counters.realTime ? {
                        left: stateData.counters.realTime.style.left,
                        top: stateData.counters.realTime.style.top
                    } : null,
                    sessionTimer: stateData.counters.sessionTimer ? {
                        left: stateData.counters.sessionTimer.style.left,
                        top: stateData.counters.sessionTimer.style.top
                    } : null,
                    antiAfk: stateData.counters.antiAfk ? {
                        left: stateData.counters.antiAfk.style.left,
                        top: stateData.counters.antiAfk.style.top
                    } : null
                }
            };

            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('[NovaCore] Storage quota exceeded, clearing old data');
                    localStorage.removeItem(LAST_UPDATE_CHECK_KEY);
                    try {
                        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
                    } catch (retryError) {
                        console.error('[NovaCore] Failed to save settings after cleanup:', retryError);
                        showErrorNotification('Unable to save settings - storage full');
                    }
                } else {
                    throw e;
                }
            }
        }, null, 'saveSettings');
    }

    function migrateSettings(settings) {
        if (!settings.version) {
            console.log('[NovaCore] Migrating settings from old version');
            settings.version = SCRIPT_VERSION;
        }
        if (!settings.currentTheme) {
            settings.currentTheme = 'cyan';
        }
        return settings;
    }

    function loadSettings() {
        return safeExecute(() => {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const settings = JSON.parse(saved);
                return migrateSettings(settings);
            }
            return null;
        }, null, 'loadSettings');
    }

    function throttle(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = performance.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    }

    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    const debouncedSave = debounce(saveSettings, TIMING.SAVE_DEBOUNCE);

    const state = new Proxy(stateData, {
        set(target, prop, value) {
            const oldValue = target[prop];
            target[prop] = value;
            if ((prop.includes('Shown') || prop === 'currentTheme') && oldValue !== value) {
                debouncedSave();
            }
            return true;
        }
    });

    // ===== MANAGED EVENT LISTENERS =====
    function addManagedListener(element, event, handler, id) {
        element.addEventListener(event, handler);

        if (!state.eventListeners.has(id)) {
            state.eventListeners.set(id, []);
        }

        state.eventListeners.get(id).push({
            element,
            event,
            handler
        });
    }

    function removeAllListeners(id) {
        const listeners = state.eventListeners.get(id);
        if (listeners) {
            listeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            state.eventListeners.delete(id);
        }
    }

    // ===== THEME SYSTEM =====
    function hexToRgb(hex) {
        const rgb = parseInt(hex.slice(1), 16);
        const r = (rgb >> 16) & 255;
        const g = (rgb >> 8) & 255;
        const b = rgb & 255;
        return `${r}, ${g}, ${b}`;
    }

    function loadCustomTheme() {
        const customColor = localStorage.getItem(CUSTOM_COLOR_KEY);
        if (customColor) {
            THEMES.custom.primary = customColor;
            THEMES.custom.primaryRgb = hexToRgb(customColor);
            THEMES.custom.shadow = customColor;
        }
    }

    function applyTheme(themeName) {
        const theme = THEMES[themeName] || THEMES.cyan;
        document.documentElement.style.setProperty('--nova-primary', theme.primary);
        document.documentElement.style.setProperty('--nova-primary-rgb', theme.primaryRgb);
        document.documentElement.style.setProperty('--nova-shadow', theme.shadow);
        state.currentTheme = themeName;

        if (cachedElements.hint) {
            cachedElements.hint.style.color = theme.primary;
            cachedElements.hint.style.textShadow = `
                0 0 4px ${theme.shadow},
                0 0 10px ${theme.shadow},
                0 0 14px ${theme.shadow}
            `;
        }
        console.log(`[NovaCore] Applied theme: ${theme.name}`);
    }

    // ===== SESSION STATISTICS =====
    function initSessionStats() {
        safeExecute(() => {
            const sessionCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0') + 1;
            state.sessionStats.sessionCount = sessionCount;
            state.sessionStats.startTime = Date.now();
            localStorage.setItem(SESSION_COUNT_KEY, sessionCount.toString());

            const savedStats = localStorage.getItem(SESSION_STATS_KEY);
            if (savedStats) {
                try {
                    const parsed = JSON.parse(savedStats);
                    state.sessionStats.totalClicks = parsed.totalClicks || 0;
                    state.sessionStats.totalKeys = parsed.totalKeys || 0;
                } catch (e) {
                    console.warn('[NovaCore] Failed to load session stats:', e);
                }
            }
            console.log(`[NovaCore] Session #${sessionCount} started`);

            // Start periodic stats updates
            state.intervals.statsUpdate = setInterval(updateStatsHistory, TIMING.STATS_UPDATE_INTERVAL);
        }, null, 'initSessionStats');
    }

    function updateStatsHistory() {
        safeExecute(() => {
            const now = Date.now();
            const sessionTime = Math.floor((now - state.sessionStats.startTime) / 1000);

            // Record current CPS (once per second)
            if (sessionTime > state.sessionStats.clicksBySecond.length) {
                state.sessionStats.clicksBySecond.push(state.cpsClicks.length);

                // Calculate running average CPS
                const sum = state.sessionStats.clicksBySecond.reduce((a, b) => a + b, 0);
                state.sessionStats.averageCPS = (sum / state.sessionStats.clicksBySecond.length).toFixed(1);
            }

            // Update total session time
            state.sessionStats.totalSessionTime = sessionTime;
        }, null, 'updateStatsHistory');
    }

    function saveSessionStats() {
        safeExecute(() => {
            localStorage.setItem(SESSION_STATS_KEY, JSON.stringify(state.sessionStats));
        }, null, 'saveSessionStats');
    }

    function showSessionStats() {
        const stats = state.sessionStats;
        const sessionTime = Date.now() - state.sessionStartTime;
        const sessionMinutes = Math.floor(sessionTime / 60000);
        const sessionSeconds = Math.floor((sessionTime % 60000) / 1000);

        const message = `
╔════════════════════════════════════════╗
║       NovaCore Session Statistics      ║
╠════════════════════════════════════════╣
║ Session #${stats.sessionCount.toString().padStart(32)}║
║ Duration: ${sessionMinutes}m ${sessionSeconds}s${' '.repeat(26 - (sessionMinutes.toString() + sessionSeconds.toString()).length)}║
╠════════════════════════════════════════╣
║ 🖱️  CLICKS                             ║
║   Total: ${stats.totalClicks.toLocaleString().padEnd(30)}║
║   Peak CPS: ${stats.peakCPS.toString().padEnd(27)}║
║   Average: ${stats.averageCPS.toString().padEnd(28)}║
╠════════════════════════════════════════╣
║ ⌨️  KEYBOARD                           ║
║   Total Keys: ${stats.totalKeys.toLocaleString().padEnd(25)}║
╠════════════════════════════════════════╣
║ 🎮 PERFORMANCE                         ║
║   Peak FPS: ${stats.peakFPS.toString().padEnd(27)}║
║   Avg FPS: ${stats.averageFPS.toString().padEnd(28)}║
╠════════════════════════════════════════╣
║ 💡 Tip: Use Ctrl+S to save console    ║
╚════════════════════════════════════════╝
        `;

        console.log(message);
        console.log('Raw Session Data:', {
            sessionId: stats.sessionCount,
            duration: sessionTime,
            stats: state.sessionStats
        });

        alert('Session stats exported to console! Press F12 to view and save.');
    }

    // ===== UPDATE CHECKER =====
    function compareVersions(v1, v2) {
        const parse = (v) => v.split('.').map(n => parseInt(n) || 0);
        const parts1 = parse(v1);
        const parts2 = parse(v2);

        const maxLen = Math.max(parts1.length, parts2.length);
        while (parts1.length < maxLen) parts1.push(0);
        while (parts2.length < maxLen) parts2.push(0);

        for (let i = 0; i < maxLen; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }

        return 0;
    }

    function showUpdateNotification(latestVersion) {
        return safeExecute(() => {
            const notification = document.createElement('div');
            notification.className = 'update-notification';
            notification.innerHTML = `
                <div class="update-notification-header">🎉 Update Available!</div>
                <div class="update-notification-body">
                    A new version of NovaCore is available!<br>
                    Current: <span class="update-notification-version">v${SCRIPT_VERSION}</span><br>
                    Latest: <span class="update-notification-version">v${latestVersion}</span>
                </div>
                <div class="update-notification-buttons">
                    <button class="update-notification-btn" id="update-btn">View on GitHub</button>
                    <button class="update-notification-btn dismiss" id="dismiss-btn">Later</button>
                </div>
            `;
            document.body.appendChild(notification);
            document.getElementById('update-btn').addEventListener('click', () => {
                window.open(`https://github.com/${GITHUB_REPO}/blob/main/NCUserscript.js`, '_blank');
                notification.remove();
            });
            document.getElementById('dismiss-btn').addEventListener('click', () => notification.remove());
            setTimeout(() => {
                if (notification.parentElement) notification.remove();
            }, 30000);
        }, null, 'showUpdateNotification');
    }

    async function checkForUpdates(manual = false) {
        return safeExecute(async () => {
            const lastCheck = localStorage.getItem(LAST_UPDATE_CHECK_KEY);
            const now = Date.now();
            if (!manual && lastCheck && (now - parseInt(lastCheck)) < UPDATE_CHECK_INTERVAL) {
                console.log('[NovaCore] Skipping update check (checked recently)');
                return;
            }
            console.log('[NovaCore] Checking for updates...');
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/NCUserscript.js`, {
                    cache: 'no-cache',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const scriptContent = await response.text();
                const versionMatch = scriptContent.match(/@version\s+([\d.]+)/);
                if (versionMatch) {
                    const latestVersion = versionMatch[1];
                    state.latestVersion = latestVersion;
                    localStorage.setItem(LAST_UPDATE_CHECK_KEY, now.toString());
                    const comparison = compareVersions(latestVersion, SCRIPT_VERSION);
                    if (comparison > 0) {
                        console.log(`[NovaCore] Update available: v${latestVersion}`);
                        state.updateAvailable = true;
                        showUpdateNotification(latestVersion);
                        if (cachedElements.checkUpdateBtn) {
                            cachedElements.checkUpdateBtn.textContent = '🎉 Update Available!';
                            cachedElements.checkUpdateBtn.classList.add('update-now-btn');
                            cachedElements.checkUpdateBtn.onclick = () => {
                                window.open(`https://github.com/${GITHUB_REPO}/blob/main/NCUserscript.js`, '_blank');
                            };
                        }
                        if (manual && cachedElements.updateStatus) {
                            cachedElements.updateStatus.textContent = `✨ v${latestVersion} available!`;
                            cachedElements.updateStatus.style.color = '#2ecc71';
                        }
                    } else {
                        console.log('[NovaCore] You are on the latest version');
                        state.updateAvailable = false;
                        if (manual && cachedElements.updateStatus) {
                            cachedElements.updateStatus.textContent = '✓ Latest version installed!';
                            cachedElements.updateStatus.style.color = '#2ecc71';
                        }
                    }
                } else {
                    throw new Error('Could not parse version');
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn('[NovaCore] Update check timed out');
                    if (manual) alert('Update check timed out. Please try again.');
                } else {
                    console.error('[NovaCore] Update check failed:', error);
                    if (manual && cachedElements.updateStatus) {
                        cachedElements.updateStatus.textContent = '✗ Check failed (offline?)';
                        cachedElements.updateStatus.style.color = '#e74c3c';
                    }
                }
            }
        }, null, 'checkForUpdates');
    }

    // ===== ENHANCED STYLES =====
const style = document.createElement('style');
style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

/* ===== CSS VARIABLES ===== */
:root {
    --nova-primary: #00ffff;
    --nova-primary-rgb: 0, 255, 255;
    --nova-shadow: #00ffff;
    --nova-bg-dark: #000000;
    --nova-bg-overlay: rgba(0, 0, 0, 0.85);
    --nova-bg-card: rgba(17, 17, 17, 0.67);
    --nova-border-radius: 12px;
    --nova-transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== ANIMATIONS ===== */
@keyframes slideDownInTop {
    0% { opacity: 0; transform: translate(-50%, -70px); }
    60% { opacity: 1; transform: translate(-50%, 5px); }
    100% { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes slideUpOutTop {
    0% { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, -100px) scale(0.9); }
}

@keyframes checkPopIn {
    0% { opacity: 0; transform: scale(0) rotate(-45deg); }
    50% { opacity: 1; transform: scale(1.4) rotate(10deg); }
    75% { transform: scale(0.9) rotate(-5deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

@keyframes fadeScaleIn {
    0% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 0.8; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
}

@keyframes strokeDashoffsetAnim {
    0% { stroke-dashoffset: 1000; opacity: 0; }
    20% { opacity: 1; }
    100% { stroke-dashoffset: 0; opacity: 1; }
}

@keyframes checkmarkFadeScale {
    0% { opacity: 0; transform: scale(0) rotate(-180deg); }
    60% { opacity: 1; transform: scale(1.3) rotate(10deg); }
    80% { transform: scale(0.9) rotate(-5deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

@keyframes fadeOut {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.95); }
}

@keyframes glowPulse {
    0%, 100% { 
        text-shadow: 0 0 8px var(--nova-shadow), 
                     0 0 20px var(--nova-shadow), 
                     0 0 30px var(--nova-shadow); 
    }
    50% { 
        text-shadow: 0 0 12px var(--nova-shadow), 
                     0 0 30px var(--nova-shadow), 
                     0 0 50px var(--nova-shadow), 
                     0 0 70px var(--nova-shadow); 
    }
}

@keyframes counterSlideIn {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes menuItemHover {
    0% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
    100% { transform: translateY(-2px); }
}

@keyframes ripple {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
}

@keyframes slideInRight {
    from { opacity: 0; transform: translateX(400px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes pulse {
    0%, 100% { box-shadow: 0 0 10px rgba(46, 204, 113, 0.5); }
    50% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.8); }
}

@keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
}

/* ===== BASE ELEMENTS ===== */
#nova-intro {
    position: fixed;
    inset: 0;
    background: var(--nova-bg-dark);
    z-index: 999999;
    user-select: none;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* ===== DOWNLOADED BUTTON ===== */
.downloaded-btn {
    position: fixed;
    top: 10vh;
    left: 50%;
    transform: translateX(-50%);
    background: #111;
    border: 2px solid #e53935;
    color: white;
    padding: 12px 40px;
    border-radius: 30px;
    font-size: 1.3rem;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 0 12px rgba(229, 57, 53, 0.7), 
                0 4px 20px rgba(229, 57, 53, 0.3);
    animation: slideDownInTop 0.8s ease forwards;
    white-space: nowrap;
    user-select: none;
    z-index: 1000001;
    backdrop-filter: blur(10px);
}

.checkmark {
    color: #e53935;
    font-size: 1.4rem;
    opacity: 0;
    transform: scale(0);
    animation-fill-mode: forwards;
    animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ===== CLIENT NAME ===== */
.client-name-container {
    position: fixed;
    bottom: 10vh;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 20px;
    opacity: 0;
    animation-fill-mode: forwards;
    animation-timing-function: ease-out;
    user-select: none;
    z-index: 1000000;
}

.client-name-svg {
    width: 400px;
    height: 100px;
    filter: drop-shadow(0 0 10px rgba(255, 23, 68, 0.5));
}

svg text {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 700;
    font-size: 72px;
    fill: white;
    stroke: #ff1744;
    stroke-width: 2px;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: strokeDashoffsetAnim 2.5s forwards ease;
    user-select: none;
}

.client-name-checkmark {
    font-size: 4.2rem;
    color: #ff1744;
    opacity: 0;
    transform: scale(0);
    animation-fill-mode: forwards;
    animation-timing-function: ease-out;
    user-select: none;
    filter: drop-shadow(0 0 8px rgba(255, 23, 68, 0.8));
}

/* ===== PERSISTENT HEADER ===== */
#nova-persistent-header {
    position: fixed;
    top: 10px;
    left: 10px;
    transform: none;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 900;
    font-size: 1.5rem;
    color: var(--nova-primary);
    text-shadow: 0 0 8px var(--nova-shadow), 
                 0 0 20px var(--nova-shadow),
                 0 0 30px var(--nova-shadow), 
                 0 0 40px var(--nova-shadow),
                 0 0 50px var(--nova-shadow);
    user-select: none;
    z-index: 100000000;
    pointer-events: none;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.5s ease, color 0.3s ease, text-shadow 0.3s ease;
    animation: glowPulse 3s ease-in-out infinite;
}

#nova-persistent-header.visible {
    opacity: 1;
}

/* ===== MENU OVERLAY ===== */
#nova-menu-overlay {
    position: fixed;
    inset: 0;
    background: var(--nova-bg-overlay);
    backdrop-filter: blur(10px);
    z-index: 10000000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 40px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease, backdrop-filter 0.35s ease;
    user-select: none;
}

#nova-menu-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

#nova-menu-header {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 3rem;
    font-weight: 900;
    color: var(--nova-primary);
    text-shadow: 0 0 8px var(--nova-shadow), 
                 0 0 20px var(--nova-shadow),
                 0 0 30px var(--nova-shadow), 
                 0 0 40px var(--nova-shadow),
                 0 0 50px var(--nova-shadow);
    user-select: none;
    margin-bottom: 30px;
    transition: color 0.3s ease, text-shadow 0.3s ease;
}

#nova-menu-content {
    width: 320px;
    background: var(--nova-bg-card);
    border-radius: 16px;
    padding: 24px;
    color: white;
    font-size: 1.1rem;
    box-shadow: 0 0 10px rgba(var(--nova-primary-rgb), 0.5),
                inset 0 0 8px rgba(var(--nova-primary-rgb), 0.3),
                0 8px 32px rgba(0, 0, 0, 0.5);
    user-select: none;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-height: 80vh;
    overflow-y: auto;
    transition: box-shadow 0.3s ease;
    backdrop-filter: blur(20px);
}

/* Custom scrollbar for menu */
#nova-menu-content::-webkit-scrollbar {
    width: 8px;
}

#nova-menu-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
}

#nova-menu-content::-webkit-scrollbar-thumb {
    background: var(--nova-primary);
    border-radius: 4px;
    transition: background 0.3s ease;
}

#nova-menu-content::-webkit-scrollbar-thumb:hover {
    background: rgba(var(--nova-primary-rgb), 0.8);
}

/* ===== MENU BUTTONS ===== */
.nova-menu-btn {
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid var(--nova-primary);
    color: var(--nova-primary);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 700;
    font-size: 1rem;
    padding: 16px 20px;
    margin-bottom: 4px;
    border-radius: 10px;
    cursor: pointer;
    transition: all var(--nova-transition);
    user-select: none;
    text-align: center;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(5px);
}

.nova-menu-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(var(--nova-primary-rgb), 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s ease, height 0.6s ease;
}

.nova-menu-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(var(--nova-primary-rgb), 0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
}

.nova-menu-btn:active::before {
    width: 300px;
    height: 300px;
}

.nova-menu-btn:active::after {
    animation: ripple 0.6s ease-out;
}

.nova-menu-btn:hover {
    background: var(--nova-primary);
    color: #000;
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 4px 12px rgba(var(--nova-primary-rgb), 0.4),
                0 8px 24px rgba(var(--nova-primary-rgb), 0.2);
    animation: menuItemHover 0.3s ease forwards;
}

/* ===== HINT TEXT ===== */
#nova-hint-text {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Press Start 2P', cursive;
    color: var(--nova-primary);
    font-size: 1.25rem;
    text-shadow: 0 0 4px var(--nova-shadow), 
                 0 0 10px var(--nova-shadow),
                 0 0 14px var(--nova-shadow);
    user-select: none;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.8s ease, color 0.3s ease, text-shadow 0.3s ease;
    z-index: 9999999;
    white-space: nowrap;
}

/* ===== COUNTERS ===== */
.counter {
    position: fixed;
    background: rgba(var(--nova-primary-rgb), 0.85);
    color: #000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 700;
    font-size: 1.25rem;
    padding: 8px 14px;
    border-radius: var(--nova-border-radius);
    box-shadow: 0 0 8px rgba(var(--nova-primary-rgb), 0.7),
                inset 0 0 8px rgba(var(--nova-primary-rgb), 0.3),
                0 4px 12px rgba(0, 0, 0, 0.3);
    user-select: none;
    cursor: grab;
    z-index: 999999999;
    width: max-content;
    max-width: 160px;
    text-align: center;
    transition: opacity 0.3s ease, 
                transform var(--nova-transition),
                background 0.3s ease, 
                box-shadow 0.3s ease;
    will-change: transform;
    animation: counterSlideIn 0.5s ease-out;
    backdrop-filter: blur(10px);
}

.counter.dragging {
    cursor: grabbing;
    opacity: 0.85;
    user-select: none;
    transform: scale(1.05);
    box-shadow: 0 0 16px rgba(var(--nova-primary-rgb), 0.9),
                inset 0 0 12px rgba(var(--nova-primary-rgb), 0.5),
                0 8px 20px rgba(0, 0, 0, 0.4);
}

.counter:hover:not(.dragging) {
    transform: scale(1.02);
    box-shadow: 0 0 12px rgba(var(--nova-primary-rgb), 0.85),
                inset 0 0 10px rgba(var(--nova-primary-rgb), 0.4),
                0 6px 16px rgba(0, 0, 0, 0.35);
}

#real-time-counter {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(var(--nova-primary-rgb), 0.85);
    color: #000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 700;
    font-size: 22px;
    padding: 8px 14px;
    border-radius: var(--nova-border-radius);
    box-shadow: 0 0 8px rgba(var(--nova-primary-rgb), 0.7),
                inset 0 0 8px rgba(var(--nova-primary-rgb), 0.3),
                0 4px 12px rgba(0, 0, 0, 0.3);
    cursor: default;
    user-select: none;
    z-index: 999999999;
    width: 180px;
    text-align: center;
    pointer-events: auto;
    transition: background 0.3s ease, box-shadow 0.3s ease;
    backdrop-filter: blur(10px);
}

#real-time-counter .counter-time-text {
    font-variant-numeric: tabular-nums;
    display: inline-block;
    min-width: 150px;
}

.counter-tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    background: black;
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.8);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
    z-index: 1000000000;
}

.counter:hover .counter-tooltip {
    opacity: 1;
}

/* ===== SETTINGS SECTIONS ===== */
.settings-section {
    border-top: 1px solid rgba(var(--nova-primary-rgb), 0.3);
    padding-top: 24px;
    margin-top: 16px;
    transition: border-color 0.3s ease;
}

.settings-label {
    font-size: 0.9rem;
    color: var(--nova-primary);
    margin-bottom: 10px;
    display: block;
    transition: color 0.3s ease;
    font-weight: 600;
}

.keybind-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid var(--nova-primary);
    color: var(--nova-primary);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 700;
    font-size: 1rem;
    padding: 8px 12px;
    border-radius: 8px;
    text-align: center;
    transition: all 0.3s ease;
}

.keybind-input:focus {
    outline: none;
    box-shadow: 0 0 12px rgba(var(--nova-primary-rgb), 0.6);
    background: rgba(var(--nova-primary-rgb), 0.15);
    transform: scale(1.02);
}

/* ===== THEME BUTTONS ===== */
.theme-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 12px;
}

.theme-btn {
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 600;
    font-size: 0.85rem;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all var(--nova-transition);
    user-select: none;
    text-align: center;
    position: relative;
    backdrop-filter: blur(5px);
}

.theme-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.theme-btn.active {
    box-shadow: 0 0 15px currentColor, 
                inset 0 0 10px currentColor;
    font-weight: 900;
}

.theme-btn.cyan { border-color: #00ffff; color: #00ffff; }
.theme-btn.purple { border-color: #9b59b6; color: #9b59b6; }
.theme-btn.green { border-color: #2ecc71; color: #2ecc71; }
.theme-btn.red { border-color: #e74c3c; color: #e74c3c; }
.theme-btn.blue { border-color: #3498db; color: #3498db; }
.theme-btn.gold { border-color: #f39c12; color: #f39c12; }
.theme-btn.pink { border-color: #ff69b4; color: #ff69b4; }
.theme-btn.orange { border-color: #ff6b35; color: #ff6b35; }
.theme-btn.custom { border-color: var(--nova-primary); color: var(--nova-primary); }

/* ===== COLOR PICKER ===== */
.color-picker-wrapper {
    margin-top: 12px;
}

.color-picker-input {
    width: 100%;
    height: 50px;
    border: 2px solid var(--nova-primary);
    border-radius: 8px;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.8);
    transition: all var(--nova-transition);
}

.color-picker-input:hover {
    box-shadow: 0 0 12px rgba(var(--nova-primary-rgb), 0.6);
    transform: scale(1.02);
}

/* ===== CREDITS ===== */
.credits-section {
    text-align: center;
    font-size: 0.85rem;
    color: #999;
    padding: 16px 0;
    border-top: 1px solid rgba(var(--nova-primary-rgb), 0.2);
    margin-top: 16px;
}

.credits-section strong {
    color: var(--nova-primary);
    font-weight: 700;
}

.credits-section a {
    color: var(--nova-primary);
    text-decoration: none;
    transition: opacity 0.3s ease;
}

.credits-section a:hover {
    opacity: 0.8;
    text-decoration: underline;
}

/* ===== UPDATE NOTIFICATION ===== */
.update-notification {
    position: fixed;
    top: 80px;
    right: 20px;
    background: rgba(0, 0, 0, 0.95);
    border: 2px solid var(--nova-primary);
    border-radius: var(--nova-border-radius);
    padding: 16px 20px;
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    box-shadow: 0 0 20px rgba(var(--nova-primary-rgb), 0.6),
                0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 100000001;
    max-width: 320px;
    animation: slideInRight 0.5s ease;
    user-select: none;
    backdrop-filter: blur(10px);
}

.update-notification-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--nova-primary);
}

.update-notification-body {
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 14px;
    color: #ddd;
}

.update-notification-version {
    color: var(--nova-primary);
    font-weight: 700;
}

.update-notification-buttons {
    display: flex;
    gap: 10px;
}

.update-notification-btn {
    flex: 1;
    background: #000;
    border: 2px solid var(--nova-primary);
    color: var(--nova-primary);
    padding: 10px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--nova-transition);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.update-notification-btn:hover {
    background: var(--nova-primary);
    color: #000;
    transform: translateY(-2px);
}

.update-notification-btn.dismiss {
    border-color: #666;
    color: #999;
}

.update-notification-btn.dismiss:hover {
    background: #666;
    color: white;
}

.update-check-status {
    font-size: 0.85rem;
    color: #999;
    text-align: center;
    margin-top: 8px;
    font-style: italic;
}

.update-now-btn {
    background: linear-gradient(135deg, #2ecc71, #27ae60) !important;
    border: 2px solid #2ecc71 !important;
    color: white !important;
    animation: pulse 2s infinite;
    font-weight: 900 !important;
}

.update-now-btn:hover {
    background: linear-gradient(135deg, #27ae60, #229954) !important;
    color: white !important;
    box-shadow: 0 4px 20px rgba(46, 204, 113, 0.6) !important;
}

/* ===== RESPONSIVE DESIGN ===== */
@media (max-width: 768px) {
    #nova-persistent-header {
        font-size: 1.2rem;
    }
    
    #nova-menu-header {
        font-size: 2rem;
    }
    
    #nova-menu-content {
        width: 90%;
        max-width: 320px;
        padding: 20px;
    }
    
    #nova-hint-text {
        font-size: 0.9rem;
    }
    
    .counter {
        font-size: 1rem;
    }
    
    .theme-grid {
        grid-template-columns: 1fr;
    }

    .downloaded-btn {
        font-size: 1.1rem;
        padding: 10px 30px;
    }

    .client-name-svg {
        width: 300px;
        height: 80px;
    }

    svg text {
        font-size: 54px;
    }
}

@media (max-width: 480px) {
    #nova-persistent-header {
        font-size: 1rem;
    }

    #nova-menu-header {
        font-size: 1.5rem;
    }

    .update-notification {
        max-width: calc(100vw - 40px);
        right: 10px;
        left: 10px;
    }
}

/* ===== ACCESSIBILITY ===== */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

/* ===== FOCUS STYLES ===== */
.nova-menu-btn:focus-visible,
.keybind-input:focus-visible,
.theme-btn:focus-visible,
.update-notification-btn:focus-visible {
    outline: 2px solid var(--nova-primary);
    outline-offset: 2px;
}
`;
document.head.appendChild(style);

    // ===== UNIFIED PERFORMANCE LOOP =====
    function startPerformanceLoop() {
        if (state.performanceLoopRunning) return;
        state.performanceLoopRunning = true;
        let lastFpsUpdate = performance.now();
        let frameCount = 0;
        let fpsSum = 0;
        let fpsCount = 0;

        function loop(currentTime) {
            if (!state.performanceLoopRunning || state.activeRAFFeatures.size === 0) {
                state.performanceLoopRunning = false;
                state.rafId = null;
                return;
            }

            if (state.activeRAFFeatures.has('fps') && state.counters.fps) {
                frameCount++;
                const elapsed = currentTime - lastFpsUpdate;
                if (elapsed >= TIMING.FPS_UPDATE_INTERVAL) {
                    const fps = Math.round((frameCount * 1000) / elapsed);

                    requestIdleCallback(() => {
                        if (state.counters.fps?.firstChild) {
                            state.counters.fps.firstChild.nodeValue = `FPS: ${fps}`;
                        }
                    });

                    if (fps > state.sessionStats.peakFPS) {
                        state.sessionStats.peakFPS = fps;
                    }

                    fpsSum += fps;
                    fpsCount++;
                    state.sessionStats.averageFPS = (fpsSum / fpsCount).toFixed(1);
                    state.sessionStats.fpsHistory.push(fps);

                    frameCount = 0;
                    lastFpsUpdate = currentTime;
                }
            }
            state.rafId = requestAnimationFrame(loop);
        }
        state.rafId = requestAnimationFrame(loop);
    }

    function stopPerformanceLoop() {
        state.activeRAFFeatures.delete('fps');
        if (state.activeRAFFeatures.size === 0) {
            state.performanceLoopRunning = false;
            if (state.rafId) {
                cancelAnimationFrame(state.rafId);
                state.rafId = null;
            }
        }
    }

    // ===== INTRO =====
    function createIntro() {
        return safeExecute(() => {
            const overlay = document.createElement('div');
            overlay.id = 'nova-intro';

            const button = document.createElement('div');
            button.className = 'downloaded-btn';
            button.textContent = 'Client Downloaded';

            const checkBtn = document.createElement('span');
            checkBtn.className = 'checkmark';
            checkBtn.textContent = '✔️';
            button.appendChild(checkBtn);
            overlay.appendChild(button);

            const clientNameContainer = document.createElement('div');
            clientNameContainer.className = 'client-name-container';

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute('viewBox', '0 0 400 100');
            svg.classList.add('client-name-svg');

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('x', '50%');
            text.setAttribute('y', '70%');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = 'NovaCore';
            svg.appendChild(text);
            clientNameContainer.appendChild(svg);

            const clientCheckmark = document.createElement('span');
            clientCheckmark.className = 'client-name-checkmark';
            clientCheckmark.textContent = '✔️';
            clientNameContainer.appendChild(clientCheckmark);
            overlay.appendChild(clientNameContainer);
            document.body.appendChild(overlay);

            setTimeout(() => checkBtn.style.animation = 'checkPopIn 0.6s forwards ease', TIMING.INTRO_CHECK_APPEAR);
            setTimeout(() => button.style.animation = 'slideUpOutTop 0.8s ease forwards', TIMING.INTRO_BUTTON_EXIT);
            setTimeout(() => {
                text.style.animation = 'strokeDashoffsetAnim 2.5s forwards ease';
                clientNameContainer.style.opacity = '1';
                clientNameContainer.style.animation = 'fadeScaleIn 0.8s ease forwards';
            }, TIMING.INTRO_TEXT_START);
            setTimeout(() => clientCheckmark.style.animation = 'checkmarkFadeScale 0.5s forwards ease', TIMING.INTRO_CHECKMARK_APPEAR);

            return overlay;
        }, null, 'createIntro');
    }

    function createPersistentHeader() {
        return safeExecute(() => {
            const header = document.createElement('div');
            header.id = 'nova-persistent-header';
            header.textContent = 'Novacore💎';
            document.body.appendChild(header);
            cachedElements.header = header;
            return header;
        }, null, 'createPersistentHeader');
    }

    function createHintText() {
        return safeExecute(() => {
            const hint = document.createElement('div');
            hint.id = 'nova-hint-text';
            hint.textContent = `Press ${state.menuKey} To Open Menu!`;
            document.body.appendChild(hint);
            cachedElements.hint = hint;
            return hint;
        }, null, 'createHintText');
    }

    // ===== DRAGGING =====
    function setupDragging(element, counterType) {
        const dragState = state.drag[counterType];
        const listenerId = `drag_${counterType}`;

        const onMouseDown = (e) => {
            dragState.active = true;
            dragState.offsetX = e.clientX - element.getBoundingClientRect().left;
            dragState.offsetY = e.clientY - element.getBoundingClientRect().top;
            element.classList.add('dragging');
            e.preventDefault();
        };

        const onMouseUp = () => {
            if (dragState.active) {
                dragState.active = false;
                element.classList.remove('dragging');
                debouncedSave();
            }
        };

        const onMouseMove = throttle((e) => {
            if (dragState.active) {
                const newX = Math.max(10, Math.min(window.innerWidth - element.offsetWidth - 10,
                                   e.clientX - dragState.offsetX));
                const newY = Math.max(10, Math.min(window.innerHeight - element.offsetHeight - 10,
                                   e.clientY - dragState.offsetY));

                requestAnimationFrame(() => {
                    element.style.left = `${newX}px`;
                    element.style.top = `${newY}px`;
                });
            }
        }, 16);

        addManagedListener(element, 'mousedown', onMouseDown, listenerId);
        addManagedListener(window, 'mouseup', onMouseUp, listenerId);
        addManagedListener(window, 'mousemove', onMouseMove, listenerId);

        return () => removeAllListeners(listenerId);
    }

    // ===== FPS COUNTER =====
    function createFPSCounter() {
        return safeExecute(() => {
            const counter = document.createElement('div');
            counter.id = 'fps-counter';
            counter.className = 'counter';
            counter.style.left = '50px';
            counter.style.top = '80px';
            counter.textContent = 'FPS: 0';

            const tooltip = document.createElement('div');
            tooltip.className = 'counter-tooltip';
            tooltip.textContent = 'Frames Per Second';
            counter.appendChild(tooltip);

            document.body.appendChild(counter);
            state.counters.fps = counter;
            state.cleanupFunctions.fps = setupDragging(counter, 'fps');
            return counter;
        }, null, 'createFPSCounter');
    }

    function startFPSCounter() {
        safeExecute(() => {
            if (!state.counters.fps) createFPSCounter();
            state.activeRAFFeatures.add('fps');
            if (!state.performanceLoopRunning) {
                startPerformanceLoop();
            }
        }, null, 'startFPSCounter');
    }

    function stopFPSCounter() {
        safeExecute(() => {
            state.fpsShown = false;
            if (state.cleanupFunctions.fps) {
                state.cleanupFunctions.fps();
                state.cleanupFunctions.fps = null;
            }
            if (state.counters.fps) {
                state.counters.fps.remove();
                state.counters.fps = null;
            }
            stopPerformanceLoop();
        }, null, 'stopFPSCounter');
    }

    // ===== CPS COUNTER =====
    function createCPSCounter() {
        return safeExecute(() => {
            const counter = document.createElement('div');
            counter.id = 'cps-counter';
            counter.className = 'counter';
            counter.style.left = '50px';
            counter.style.top = '150px';
            counter.textContent = 'CPS: 0';

            const tooltip = document.createElement('div');
            tooltip.className = 'counter-tooltip';
            tooltip.textContent = 'Clicks Per Second';
            counter.appendChild(tooltip);

            document.body.appendChild(counter);
            state.counters.cps = counter;

            const dragCleanup = setupDragging(counter, 'cps');

            cpsClickListenerRef = (e) => {
                if (e.button === 0) {
                    const now = performance.now();
                    state.cpsClicks.push(now);
                    state.sessionStats.totalClicks++;

                    const cutoff = now - TIMING.CPS_WINDOW;
                    while (state.cpsClicks.length > 0 && state.cpsClicks[0] < cutoff) {
                        state.cpsClicks.shift();
                    }

                    if (state.cpsClicks.length > state.sessionStats.peakCPS) {
                        state.sessionStats.peakCPS = state.cpsClicks.length;
                    }
                    updateCPSCounter();
                }
            };

            addManagedListener(window, 'mousedown', cpsClickListenerRef, 'cps_clicks');

            state.cleanupFunctions.cps = () => {
                dragCleanup();
                removeAllListeners('cps_clicks');
            };

            return counter;
        }, null, 'createCPSCounter');
    }

    function updateCPSCounter() {
        safeExecute(() => {
            if (state.counters.cps && state.counters.cps.firstChild) {
                state.counters.cps.firstChild.nodeValue = `CPS: ${state.cpsClicks.length}`;
            }
        }, null, 'updateCPSCounter');
    }

    function startCPSCounter() {
        safeExecute(() => {
            if (!state.counters.cps) createCPSCounter();
            state.cpsClicks = [];
            state.intervals.cps = setInterval(() => {
                const cutoff = performance.now() - TIMING.CPS_WINDOW;
                while (state.cpsClicks.length > 0 && state.cpsClicks[0] < cutoff) {
                    state.cpsClicks.shift();
                }
                updateCPSCounter();
            }, TIMING.CPS_UPDATE_INTERVAL);
        }, null, 'startCPSCounter');
    }

    function stopCPSCounter() {
        safeExecute(() => {
            if (state.cleanupFunctions.cps) {
                state.cleanupFunctions.cps();
                state.cleanupFunctions.cps = null;
            }
            if (state.counters.cps) {
                state.counters.cps.remove();
                state.counters.cps = null;
            }
            if (state.intervals.cps) {
                clearInterval(state.intervals.cps);
                state.intervals.cps = null;
            }
            state.cpsClicks = [];
        }, null, 'stopCPSCounter');
    }

    // ===== REAL TIME COUNTER =====
    function createRealTimeCounter() {
        return safeExecute(() => {
            const counter = document.createElement('div');
            counter.id = 'real-time-counter';
            counter.className = 'counter';

            const timeText = document.createElement('span');
            timeText.className = 'counter-time-text';
            counter.appendChild(timeText);

            const tooltip = document.createElement('div');
            tooltip.className = 'counter-tooltip';
            tooltip.textContent = "Shows you the time so you don't have to exit Fullscreen";
            counter.appendChild(tooltip);

            document.body.appendChild(counter);
            state.counters.realTime = counter;
            return counter;
        }, null, 'createRealTimeCounter');
    }

    function updateRealTime() {
        safeExecute(() => {
            if (!state.counters.realTime) return;
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;

            const timeText = state.counters.realTime.querySelector('.counter-time-text');
            if (timeText) {
                timeText.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
            }
        }, null, 'updateRealTime');
    }

    function startRealTimeCounter() {
        safeExecute(() => {
            if (!state.counters.realTime) createRealTimeCounter();
            updateRealTime();
            state.intervals.realTime = setInterval(updateRealTime, 1000);
        }, null, 'startRealTimeCounter');
    }

    function stopRealTimeCounter() {
        safeExecute(() => {
            if (state.counters.realTime) {
                state.counters.realTime.remove();
                state.counters.realTime = null;
            }
            if (state.intervals.realTime) {
                clearInterval(state.intervals.realTime);
                state.intervals.realTime = null;
            }
        }, null, 'stopRealTimeCounter');
    }

    // ===== SESSION TIMER =====
    function getSessionStartTime() {
        return safeExecute(() => {
            const currentSessionId = Date.now() + '_' + Math.random();
            const savedSessionId = sessionStorage.getItem(SESSION_ID_KEY);

            if (!savedSessionId || savedSessionId !== currentSessionId) {
                sessionStorage.setItem(SESSION_ID_KEY, currentSessionId);
                const now = Date.now();
                localStorage.setItem(SESSION_START_KEY, now.toString());
                return now;
            }

            const saved = localStorage.getItem(SESSION_START_KEY);
            if (saved) {
                return parseInt(saved, 10);
            }

            const now = Date.now();
            localStorage.setItem(SESSION_START_KEY, now.toString());
            return now;
        }, Date.now(), 'getSessionStartTime');
    }

    function resetSessionTimer() {
        safeExecute(() => {
            const now = Date.now();
            localStorage.setItem(SESSION_START_KEY, now.toString());
            state.sessionStartTime = now;
            updateSessionTimer();
        }, null, 'resetSessionTimer');
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    function createSessionTimerCounter() {
        return safeExecute(() => {
            const counter = document.createElement('div');
            counter.id = 'session-timer-counter';
            counter.className = 'counter';
            counter.style.left = '50px';
            counter.style.top = '220px';

            const timeText = document.createElement('span');
            timeText.className = 'counter-time-text';
            counter.appendChild(timeText);

            const tooltip = document.createElement('div');
            tooltip.className = 'counter-tooltip';
            tooltip.textContent = 'Session Time - Right click to reset';
            counter.appendChild(tooltip);

            counter.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm('Reset session timer?')) {
                    resetSessionTimer();
                }
            });

            document.body.appendChild(counter);
            state.counters.sessionTimer = counter;
            state.cleanupFunctions.sessionTimer = setupDragging(counter, 'sessionTimer');
            return counter;
        }, null, 'createSessionTimerCounter');
    }

    function updateSessionTimer() {
        safeExecute(() => {
            if (!state.counters.sessionTimer) return;
            const elapsed = Date.now() - state.sessionStartTime;
            const timeText = state.counters.sessionTimer.querySelector('.counter-time-text');
            if (timeText) {
                timeText.textContent = `⏱️ ${formatTime(elapsed)}`;
            }
        }, null, 'updateSessionTimer');
    }

    function startSessionTimer() {
        safeExecute(() => {
            if (!state.counters.sessionTimer) createSessionTimerCounter();
            state.sessionStartTime = getSessionStartTime();
            updateSessionTimer();
            state.intervals.sessionTimer = setInterval(updateSessionTimer, 1000);
        }, null, 'startSessionTimer');
    }

    function stopSessionTimer() {
        safeExecute(() => {
            if (state.cleanupFunctions.sessionTimer) {
                state.cleanupFunctions.sessionTimer();
                state.cleanupFunctions.sessionTimer = null;
            }
            if (state.counters.sessionTimer) {
                state.counters.sessionTimer.remove();
                state.counters.sessionTimer = null;
            }
            if (state.intervals.sessionTimer) {
                clearInterval(state.intervals.sessionTimer);
                state.intervals.sessionTimer = null;
            }
        }, null, 'stopSessionTimer');
    }

    // ===== ANTI-AFK =====
    function createAntiAfkCounter() {
        return safeExecute(() => {
            const counter = document.createElement('div');
            counter.id = 'anti-afk-counter';
            counter.className = 'counter';
            counter.style.left = '50px';
            counter.style.top = '290px';

            const timeText = document.createElement('span');
            timeText.className = 'counter-time-text';
            counter.appendChild(timeText);

            const tooltip = document.createElement('div');
            tooltip.className = 'counter-tooltip';
            tooltip.textContent = 'Anti-AFK - Auto jumps to prevent kick';
            counter.appendChild(tooltip);

            document.body.appendChild(counter);
            state.counters.antiAfk = counter;
            state.cleanupFunctions.antiAfk = setupDragging(counter, 'antiAfk');
            return counter;
        }, null, 'createAntiAfkCounter');
    }

    function pressSpace() {
        const down = new KeyboardEvent("keydown", {
            key: " ", code: "Space", keyCode: 32, which: 32, bubbles: true,
        });
        const up = new KeyboardEvent("keyup", {
            key: " ", code: "Space", keyCode: 32, which: 32, bubbles: true,
        });
        window.dispatchEvent(down);
        setTimeout(() => window.dispatchEvent(up), 50);
    }

    function updateAntiAfkCounter() {
        safeExecute(() => {
            if (!state.counters.antiAfk) return;
            const timeText = state.counters.antiAfk.querySelector('.counter-time-text');
            if (timeText) {
                timeText.textContent = `⚡ Jumping in ${state.antiAfkCountdown}s`;
            }
        }, null, 'updateAntiAfkCounter');
    }

    function startAntiAfk() {
        safeExecute(() => {
            if (!state.counters.antiAfk) createAntiAfkCounter();
            state.antiAfkCountdown = 5;
            updateAntiAfkCounter();

            state.intervals.antiAfk = setInterval(() => {
                state.antiAfkCountdown--;
                updateAntiAfkCounter();
                if (state.antiAfkCountdown <= 0) {
                    pressSpace();
                    state.antiAfkCountdown = 5;
                }
            }, 1000);
        }, null, 'startAntiAfk');
    }

    function stopAntiAfk() {
        safeExecute(() => {
            if (state.cleanupFunctions.antiAfk) {
                state.cleanupFunctions.antiAfk();
                state.cleanupFunctions.antiAfk = null;
            }
            if (state.counters.antiAfk) {
                state.counters.antiAfk.remove();
                state.counters.antiAfk = null;
            }
            if (state.intervals.antiAfk) {
                clearInterval(state.intervals.antiAfk);
                state.intervals.antiAfk = null;
            }
            state.antiAfkCountdown = 5;
        }, null, 'stopAntiAfk');
    }

    // ===== MENU =====
    function createMenu() {
        return safeExecute(() => {
            const menuOverlay = document.createElement('div');
            menuOverlay.id = 'nova-menu-overlay';
            menuOverlay.setAttribute('role', 'dialog');
            menuOverlay.setAttribute('aria-label', 'NovaCore Settings Menu');
            menuOverlay.setAttribute('aria-modal', 'true');

            const menuHeader = document.createElement('div');
            menuHeader.id = 'nova-menu-header';
            menuHeader.textContent = 'Novacore💎';
            menuOverlay.appendChild(menuHeader);

            const menuContent = document.createElement('div');
            menuContent.id = 'nova-menu-content';

            const focusableElements = [];

            const createButton = (text, onClick, ariaLabel) => {
                const btn = document.createElement('button');
                btn.className = 'nova-menu-btn';
                btn.textContent = text;
                btn.setAttribute('aria-label', ariaLabel || text);
                btn.addEventListener('click', onClick);
                focusableElements.push(btn);
                return btn;
            };

            const fpsBtn = createButton('FPS Counter', () => {
                if (state.fpsShown) {
                    state.fpsShown = false;
                    stopFPSCounter();
                    fpsBtn.textContent = 'FPS Counter';
                } else {
                    state.fpsShown = true;
                    startFPSCounter();
                    fpsBtn.textContent = 'Hide FPS Counter';
                }
            }, 'Toggle FPS Counter');
            menuContent.appendChild(fpsBtn);

            const cpsBtn = createButton('CPS Counter', () => {
                if (state.cpsShown) {
                    stopCPSCounter();
                    cpsBtn.textContent = 'CPS Counter';
                    state.cpsShown = false;
                } else {
                    startCPSCounter();
                    cpsBtn.textContent = 'Hide CPS Counter';
                    state.cpsShown = true;
                }
            }, 'Toggle CPS Counter');
            menuContent.appendChild(cpsBtn);

            const realTimeBtn = createButton('Real Time', () => {
                if (state.realTimeShown) {
                    stopRealTimeCounter();
                    realTimeBtn.textContent = 'Real Time';
                    state.realTimeShown = false;
                } else {
                    startRealTimeCounter();
                    realTimeBtn.textContent = 'Hide Real Time';
                    state.realTimeShown = true;
                }
            }, 'Toggle Real Time Clock');
            menuContent.appendChild(realTimeBtn);

            const sessionTimerBtn = createButton('Session Timer', () => {
                if (state.sessionTimerShown) {
                    stopSessionTimer();
                    sessionTimerBtn.textContent = 'Session Timer';
                    state.sessionTimerShown = false;
                } else {
                    startSessionTimer();
                    sessionTimerBtn.textContent = 'Hide Session Timer';
                    state.sessionTimerShown = true;
                }
            }, 'Toggle Session Timer');
            menuContent.appendChild(sessionTimerBtn);

            const antiAfkBtn = createButton('Anti-AFK', () => {
                if (state.antiAfkEnabled) {
                    stopAntiAfk();
                    antiAfkBtn.textContent = 'Anti-AFK';
                    state.antiAfkEnabled = false;
                } else {
                    startAntiAfk();
                    antiAfkBtn.textContent = 'Disable Anti-AFK';
                    state.antiAfkEnabled = true;
                }
            }, 'Toggle Anti-AFK');
            menuContent.appendChild(antiAfkBtn);

            const fullscreenBtn = createButton('Auto Fullscreen', () => {
                const elem = document.documentElement;
                if (!document.fullscreenElement) {
                    elem.requestFullscreen().catch(err => {
                        alert(`Error trying to enable fullscreen: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            }, 'Toggle Fullscreen');
            menuContent.appendChild(fullscreenBtn);

            // Theme section
            const themeSection = document.createElement('div');
            themeSection.className = 'settings-section';

            const themeLabel = document.createElement('label');
            themeLabel.className = 'settings-label';
            themeLabel.textContent = 'Theme:';
            themeSection.appendChild(themeLabel);

            const themeGrid = document.createElement('div');
            themeGrid.className = 'theme-grid';

            Object.keys(THEMES).forEach(themeKey => {
                const theme = THEMES[themeKey];
                const themeBtn = document.createElement('button');
                themeBtn.className = `theme-btn ${themeKey}`;
                themeBtn.textContent = theme.name.replace(' (Default)', '');
                themeBtn.setAttribute('aria-label', `Select ${theme.name} theme`);

                if (state.currentTheme === themeKey) {
                    themeBtn.classList.add('active');
                }

                themeBtn.addEventListener('click', () => {
                    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
                    themeBtn.classList.add('active');
                    applyTheme(themeKey);
                });

                focusableElements.push(themeBtn);
                themeGrid.appendChild(themeBtn);
            });

            themeSection.appendChild(themeGrid);
            menuContent.appendChild(themeSection);

            // Custom Color Picker
            const colorPickerSection = document.createElement('div');
            colorPickerSection.className = 'settings-section';

            const colorPickerLabel = document.createElement('label');
            colorPickerLabel.className = 'settings-label';
            colorPickerLabel.textContent = 'Custom Theme Color:';
            colorPickerSection.appendChild(colorPickerLabel);

            const colorPickerWrapper = document.createElement('div');
            colorPickerWrapper.className = 'color-picker-wrapper';

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'color-picker-input';
            colorInput.value = THEMES.custom.primary;
            colorInput.setAttribute('aria-label', 'Choose custom theme color');

            colorInput.addEventListener('change', (e) => {
                const color = e.target.value;
                localStorage.setItem(CUSTOM_COLOR_KEY, color);
                THEMES.custom.primary = color;
                THEMES.custom.primaryRgb = hexToRgb(color);
                THEMES.custom.shadow = color;
                applyTheme('custom');
                document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelector('.theme-btn.custom')?.classList.add('active');
            });

            focusableElements.push(colorInput);
            colorPickerWrapper.appendChild(colorInput);
            colorPickerSection.appendChild(colorPickerWrapper);
            menuContent.appendChild(colorPickerSection);

            // Keybind section
            const settingsSection = document.createElement('div');
            settingsSection.className = 'settings-section';

            const keybindLabel = document.createElement('label');
            keybindLabel.className = 'settings-label';
            keybindLabel.textContent = 'Menu Keybind:';
            settingsSection.appendChild(keybindLabel);

            const keybindInput = document.createElement('input');
            keybindInput.type = 'text';
            keybindInput.className = 'keybind-input';
            keybindInput.value = state.menuKey;
            keybindInput.readOnly = true;
            keybindInput.placeholder = 'Press a key...';
            keybindInput.setAttribute('aria-label', 'Menu keybind input');

            keybindInput.addEventListener('keydown', (e) => {
                e.preventDefault();
                if (e.key === 'Escape') {
                    keybindInput.value = state.menuKey;
                    keybindInput.blur();
                    return;
                }
                state.menuKey = e.key;
                keybindInput.value = e.key;
                if (cachedElements.hint) {
                    cachedElements.hint.textContent = `Press ${state.menuKey} To Open Menu!`;
                }
                keybindInput.blur();
            });

            focusableElements.push(keybindInput);
            settingsSection.appendChild(keybindInput);
            menuContent.appendChild(settingsSection);

            // Update checker section
            const updateSection = document.createElement('div');
            updateSection.className = 'settings-section';

            const updateLabel = document.createElement('label');
            updateLabel.className = 'settings-label';
            updateLabel.textContent = 'Updates:';
            updateSection.appendChild(updateLabel);

            const checkUpdateBtn = createButton('Check for Updates', () => {
                checkUpdateBtn.textContent = 'Checking...';
                checkUpdateBtn.disabled = true;
                checkForUpdates(true).finally(() => {
                    setTimeout(() => {
                        if (!state.updateAvailable) {
                            checkUpdateBtn.textContent = 'Check for Updates';
                        }
                        checkUpdateBtn.disabled = false;
                    }, 2000);
                });
            }, 'Check for script updates');
            updateSection.appendChild(checkUpdateBtn);
            cachedElements.checkUpdateBtn = checkUpdateBtn;

            const updateStatus = document.createElement('div');
            updateStatus.className = 'update-check-status';
            updateStatus.textContent = `Current version: v${SCRIPT_VERSION}`;
            updateSection.appendChild(updateStatus);
            cachedElements.updateStatus = updateStatus;

            menuContent.appendChild(updateSection);

            // Session Stats Section
            const statsSection = document.createElement('div');
            statsSection.className = 'settings-section';

            const statsLabel = document.createElement('label');
            statsLabel.className = 'settings-label';
            statsLabel.textContent = 'Session Statistics:';
            statsSection.appendChild(statsLabel);

            const statsBtn = createButton('📊 View Session Stats', showSessionStats, 'View session statistics');
            statsSection.appendChild(statsBtn);

            menuContent.appendChild(statsSection);

            // Credits Section
            const creditsSection = document.createElement('div');
            creditsSection.className = 'settings-section credits-section';

            creditsSection.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <strong>NovaCore v${SCRIPT_VERSION}</strong>
                </div>
                <div style="margin: 4px 0;">Original by <strong>@Scripter132132</strong></div>
                <div style="margin: 4px 0;">Enhanced by <strong>@TheM1ddleM1n</strong></div>
                <div style="margin-top: 12px; font-size: 0.75rem;">
                    <a href="https://github.com/${GITHUB_REPO}" target="_blank">
                        ⭐ View on GitHub
                    </a>
                </div>
            `;

            menuContent.appendChild(creditsSection);

            menuOverlay.appendChild(menuContent);
            document.body.appendChild(menuOverlay);

            // Keyboard navigation
            menuOverlay.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const currentIndex = focusableElements.indexOf(document.activeElement);
                    const nextIndex = e.shiftKey ?
                        (currentIndex - 1 + focusableElements.length) % focusableElements.length :
                        (currentIndex + 1) % focusableElements.length;
                    focusableElements[nextIndex]?.focus();
                }
            });

            cachedElements.menu = menuOverlay;
            cachedElements.fpsBtn = fpsBtn;
            cachedElements.cpsBtn = cpsBtn;
            cachedElements.realTimeBtn = realTimeBtn;
            cachedElements.sessionTimerBtn = sessionTimerBtn;
            cachedElements.antiAfkBtn = antiAfkBtn;
            cachedElements.fullscreenBtn = fullscreenBtn;
            cachedElements.focusableElements = focusableElements;

            menuOverlay.addEventListener('click', (e) => {
                if (e.target === menuOverlay) {
                    closeMenu();
                }
            });

            return menuOverlay;
        }, null, 'createMenu');
    }

    function openMenu() {
        if (cachedElements.menu) {
            cachedElements.menu.classList.add('show');
            if (cachedElements.header) {
                cachedElements.header.classList.remove('visible');
            }
            setTimeout(() => cachedElements.focusableElements?.[0]?.focus(), 100);
        }
    }

    function closeMenu() {
        if (cachedElements.menu) {
            cachedElements.menu.classList.remove('show');
            if (cachedElements.header) {
                cachedElements.header.classList.add('visible');
            }
        }
    }

    function toggleMenu() {
        if (cachedElements.menu && cachedElements.menu.classList.contains('show')) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    // ===== FULLSCREEN HANDLER =====
    function setupFullscreenHandler() {
        document.addEventListener('fullscreenchange', () => {
            safeExecute(() => {
                if (cachedElements.fullscreenBtn) {
                    if (document.fullscreenElement) {
                        cachedElements.fullscreenBtn.textContent = 'Exit Fullscreen';
                    } else {
                        cachedElements.fullscreenBtn.textContent = 'Auto Fullscreen';
                    }
                }
            }, null, 'fullscreenchange');
        });
    }

    // ===== KEYBOARD HANDLER =====
    function setupKeyboardHandler() {
        window.addEventListener('keydown', (e) => {
            if (e.key === state.menuKey) {
                e.preventDefault();
                toggleMenu();
            } else if (e.key === 'Escape' && cachedElements.menu && cachedElements.menu.classList.contains('show')) {
                e.preventDefault();
                closeMenu();
            }
        });
    }

    // ===== RESTORE SAVED STATE =====
    function restoreSavedState() {
        safeExecute(() => {
            const settings = loadSettings();
            if (!settings) return;

            if (settings.menuKey) {
                state.menuKey = settings.menuKey;
                if (cachedElements.hint) {
                    cachedElements.hint.textContent = `Press ${state.menuKey} To Open Menu!`;
                }
            }

            if (settings.currentTheme) {
                applyTheme(settings.currentTheme);
            }

            if (settings.fpsShown) {
                startFPSCounter();
                state.fpsShown = true;
                if (cachedElements.fpsBtn) {
                    cachedElements.fpsBtn.textContent = 'Hide FPS Counter';
                }
                if (settings.positions?.fps && state.counters.fps) {
                    state.counters.fps.style.left = settings.positions.fps.left;
                    state.counters.fps.style.top = settings.positions.fps.top;
                }
            }

            if (settings.cpsShown) {
                startCPSCounter();
                state.cpsShown = true;
                if (cachedElements.cpsBtn) {
                    cachedElements.cpsBtn.textContent = 'Hide CPS Counter';
                }
                if (settings.positions?.cps && state.counters.cps) {
                    state.counters.cps.style.left = settings.positions.cps.left;
                    state.counters.cps.style.top = settings.positions.cps.top;
                }
            }

            if (settings.realTimeShown) {
                startRealTimeCounter();
                state.realTimeShown = true;
                if (cachedElements.realTimeBtn) {
                    cachedElements.realTimeBtn.textContent = 'Hide Real Time';
                }
            }

            if (settings.sessionTimerShown) {
                startSessionTimer();
                state.sessionTimerShown = true;
                if (cachedElements.sessionTimerBtn) {
                    cachedElements.sessionTimerBtn.textContent = 'Hide Session Timer';
                }
                if (settings.positions?.sessionTimer && state.counters.sessionTimer) {
                    state.counters.sessionTimer.style.left = settings.positions.sessionTimer.left;
                    state.counters.sessionTimer.style.top = settings.positions.sessionTimer.top;
                }
            }

            if (settings.antiAfkEnabled) {
                startAntiAfk();
                state.antiAfkEnabled = true;
                if (cachedElements.antiAfkBtn) {
                    cachedElements.antiAfkBtn.textContent = 'Disable Anti-AFK';
                }
                if (settings.positions?.antiAfk && state.counters.antiAfk) {
                    state.counters.antiAfk.style.left = settings.positions.antiAfk.left;
                    state.counters.antiAfk.style.top = settings.positions.antiAfk.top;
                }
            }
        }, null, 'restoreSavedState');
    }

    // ===== GLOBAL CLEANUP =====
    function globalCleanup() {
        safeExecute(() => {
            console.log('[NovaCore] Cleaning up resources...');
            saveSessionStats();
            stopFPSCounter();
            stopCPSCounter();
            stopRealTimeCounter();
            stopSessionTimer();
            stopAntiAfk();

            Object.values(state.intervals).forEach(interval => {
                if (interval) clearInterval(interval);
            });

            if (state.rafId) {
                cancelAnimationFrame(state.rafId);
            }

            Object.values(state.cleanupFunctions).forEach(cleanup => {
                if (cleanup) cleanup();
            });

            state.eventListeners.forEach((listeners, id) => {
                removeAllListeners(id);
            });

            stopPerformanceLoop();
            console.log('[NovaCore] Cleanup complete');
        }, null, 'globalCleanup');
    }

    window.addEventListener('beforeunload', globalCleanup);

    // Auto-save session stats every 30 seconds
    setInterval(() => {
        saveSessionStats();
    }, 30000);

    // ===== INITIALIZATION =====
    function init() {
        safeExecute(() => {
            console.log(`[NovaCore] Initializing version ${SCRIPT_VERSION}...`);

            loadCustomTheme();
            initSessionStats();

            const intro = createIntro();
            const header = createPersistentHeader();
            const hint = createHintText();
            const menu = createMenu();

            setupFullscreenHandler();
            setupKeyboardHandler();

            setTimeout(() => {
                intro.style.animation = 'fadeOut 1s ease forwards';
                setTimeout(() => {
                    intro.remove();
                    header.classList.add('visible');
                    hint.style.opacity = '1';

                    setTimeout(() => {
                        hint.style.opacity = '0';
                    }, TIMING.HINT_TEXT_DURATION);

                    restoreSavedState();
                    console.log('[NovaCore] Initialization complete');

                    setTimeout(() => checkForUpdates(false), 2000);
                }, TIMING.INTRO_FADE_OUT);
            }, TIMING.INTRO_TOTAL_DURATION);
        }, null, 'init');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
