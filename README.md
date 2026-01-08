# NovaCoreX V3 Enhanced - Premium Miniblox Userscript 💎

<div align="center">

![Version](https://img.shields.io/badge/version-3.4-custom?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-custom?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Tampermonkey-custom?style=for-the-badge)

**A lightweight, feature-rich userscript for Miniblox with real-time monitoring, unlimited custom colors, and optimization.**

[Installation](#-installation) • [Features](#-features) • [Usage](#-usage) • [Customization](#-customization) • [Troubleshooting](#-troubleshooting)

</div>

---

## 🚀 Installation

1. **Install Tampermonkey:** 
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Safari](https://apps.apple.com/app/tampermonkey/id1482490089)
   - [Opera](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)

2. **Install NovaCoreX:** Click [here](https://github.com/TheM1ddleM1n/NovaCoreX/raw/main/NCUserscript.js) and confirm in Tampermonkey

3. **Open** [miniblox.io](https://miniblox.io) and press `\` to open the menu

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **FPS Counter** | Real-time frames per second (updates every 500ms) |
| **CPS Counter** | Clicks per second tracker with 1-second window |
| **Real-Time Clock** | Check time without exiting fullscreen |
| **Ping Counter** | Network latency monitoring |
| **Anti-AFK** | Auto-jump every 5 seconds to prevent kicks |
| **Custom Color Theme** | Unlimited color choices, persists across sessions |
| **Draggable Counters** | Move any counter anywhere, positions auto-save |
| **Custom Keybinds** | Set your preferred menu hotkey |
| **Auto-Updates** | GitHub checker alerts you to new versions |
| **Auto-Fullscreen** | One-click fullscreen toggle |

---

## 🎮 Usage

### Open Menu
- Press `\` (backslash) — change keybind in settings

### Enable Counters
- Open menu → click any counter to toggle it on/off
- **Drag** counters to reposition them (positions save automatically)

### Customize Color
- Menu → **Custom Theme Color** → pick any color you want
- Color persists across all page refreshes
- All UI elements update to match your selected color

### Anti-AFK
- Menu → click **Anti-AFK** to enable
- Script automatically jumps every 5 seconds
- Prevents being kicked for inactivity

### Change Keybind
- Menu → **Menu Keybind** → press desired key
- Settings save automatically

### Check Updates
- Menu → **Updates** → click **Check for Updates**
- Notifies you when a newer version is available

---

## 🎨 Customization

### Color Picker
The custom color picker allows you to select **any color** you want. Your selection is saved to browser storage and automatically applied on every page load.

**How it works:**
1. Open menu with `\`
2. Scroll to **Custom Theme Color**
3. Click the color input box
4. Choose your desired color
5. Color applies instantly to all UI elements

**Storage:** Colors are stored in `novacore_custom_color` localStorage key

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Script not showing | Refresh page (`F5`), check Tampermonkey is enabled |
| Menu won't open | Try changing keybind in settings, maybe `\` is already bound |
| Counters not updating | Make sure you're playing, disable/re-enable the counter |
| Color not persisting | Check if localStorage is enabled, try a different browser |
| Performance issues | Disable unnecessary counters, close other tabs |

---

## ⚙️ Technical Details

**Performance:** 50-70% lighter than alternatives, zero-lag gameplay
- Smart update intervals (FPS 500ms, CPS 250ms, Ping 1s)
- Passive event listeners, optimized rendering
- Perfect cleanup on exit, no memory leaks

**Storage Keys:**
- `novacore_settings` — Feature toggles, positions, keybinds
- `novacore_custom_color` — Your selected custom color (persists forever)
- `novacore_last_update_check` — Update checker timestamp
- `novacore_session_count` — Session counter

**Default Color:**
- Cyan (`#00ffff`) — Until you choose your own

---

## 📋 Version History

- **v3.4** — Custom color only theme system, localStorage persistence, simplified UI

- **v3.3** — Code refactoring, consolidated factory functions

- **v3.2** — 150+ lines removed, unified counter updates

- **v3.0-3.1** — Core optimizations, theme system, anti-AFK

- **v2.0-2.9** — Development phases

- **v1.0** — Original by @Scripter132132

---

## 🤝 Contributing

- **Report bugs:** [GitHub Issues](https://github.com/TheM1ddleM1n/NovaCoreX/issues)
- **Suggest features:** [GitHub Discussions](https://github.com/TheM1ddleM1n/NovaCoreX/discussions)
- **Submit code:** Fork → create feature branch → submit PR

---

## 📜 License & Credits

**MIT License** — Free to use, modify, and distribute

**Team:**
- **@Scripter132132** — Original NovaCore V1 creator
- **@TheM1ddleM1n** — V2-4 enhancements and maintenance

**Thanks to:** Tampermonkey team, Miniblox community

---

## 📞 Support

- 🐛 Issues: [github.com/TheM1ddleM1n/NovaCoreX/issues](https://github.com/TheM1ddleM1n/NovaCoreX/issues)
- 💬 Discussions: [github.com/TheM1ddleM1n/NovaCoreX/discussions](https://github.com/TheM1ddleM1n/NovaCoreX/discussions)

---

<div align="center">

**Made with 💎 for the Miniblox community**

*Zero lag. Maximum customization. Pure enhancement.*

</div>
