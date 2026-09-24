# Antigravity Games (`agy`)

> **Accessible, ad-free card games engineered specifically for iPhone.**  
> Crafted with love for Shawn’s mom (78, monocular vision with floaters).

**Live Game Hub**: [https://sghanna.github.io/agy/](https://sghanna.github.io/agy/)

---

## 🎴 Games in this Collection

### 1. [Hearts](https://sghanna.github.io/agy/hearts/) (`/hearts/`)
* **Features**: Full 4-player Hearts against AI (Michael, Jerry, Barbara), standard 3-card passing rotation (Left, Right, Across, Hold), penalty tracking (Hearts = 1, Queen of Spades = 13), and Moon Shot detection.
* **Senior Accessibility**: Two-row layout with dynamic row expansion (up to 7 cards of same suit seamlessly presented on one row), 44px+ touch targets, high-contrast gold/crimson/emerald palette, and large Didone indices.
* **Installable**: Full PWA offline support with custom Dragon Medallion iOS icon.

### 2. [Solitaire](https://sghanna.github.io/agy/solitaire/) (`/solitaire/`)
* **Features**: Classic Klondike Solitaire featuring guaranteed winnable deals, Deal 1 / Deal 3 modes, intelligent auto-complete, multi-level undo, and celebratory win animations.
* **Senior Accessibility**: Extra-large card faces, glare-resistant deep felt green table, top floating HUD, high-legibility numerals, and zero vertical scroll on iPhone 16e Safari viewport (`390×844`).
* **Installable**: Full PWA offline cache and home screen shortcut support.

---

## 🏛️ Monorepo Architecture & Standard

All games built by Antigravity are published in this repository under dedicated subdirectories:
```
sghanna/agy/
├── index.html            # Unified Game Hub Portal
├── solitaire/            # Klondike Solitaire web app & PWA
├── hearts/               # Hearts card game web app & PWA
└── future-games/         # Euchre, Word Games, etc.
```

### GitHub Pages Routing:
* **Hub**: `https://sghanna.github.io/agy/`
* **Solitaire**: `https://sghanna.github.io/agy/solitaire/`
* **Hearts**: `https://sghanna.github.io/agy/hearts/`

---

## 📱 Senior Accessibility Directives
* **Zero Scrolling**: Guaranteed single-screen viewport fit on iPhone 16e (`390×844` physical / `390×740` Safari chrome).
* **High Contrast**: Minimum AAA contrast ratio with ruby hearts/diamonds, golden clubs/spades, and dark green felt background.
* **Large Touch Targets**: Minimum 44×44px interactive areas.
* **100% Ad-Free & Privacy First**: No tracking, no ads, no in-app purchases, completely offline-ready.
