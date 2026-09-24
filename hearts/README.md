# Antigravity Hearts (`agy-hearts`)

An accessible, ad-free, installable iPhone Hearts game built specifically for Shawn's mom (78, single-eye vision with floaters).

Matching the established [Mom Solitaire standard](file:///Users/shawnmac/agy-solitaire), this standalone implementation is completely decoupled from any other agent codebase and features Antigravity's winning visual design system, pure Pagat rules engine, and senior-friendly AI.

---

## Key Features & Accessibility Standards

1. **Option C Imperial Dragon Medallion Crest**:
   - Cantonese sunburst radiance filigree ring in warm brass (`#fbbf24`).
   - Three-peaked golden flame crest anchoring the top.
   - Deep crimson ruby heart with central glowing gold pearl.

2. **Intelligent Dynamic 2-Row Fan Layout**:
   - Accommodates up to 7 cards of the same suit unbroken on a single row (e.g. 7 Hearts expands Row 2 to $358\text{ px}$ wide with $47\text{ px}$ tap step).
   - Generous exposed left strip ($47 \times 72\text{ px}$ minimum) showing heavy Didone serif rank and crisp traced vector suit pip.
   - Sits at $186\text{ px}$ hand height, conserving vertical space so table felt and trick cards remain completely open even on shorter $740\text{ px}$ Safari toolbar viewports.

3. **Pure Rules Engine (`js/engine.js`)**:
   - 52 unique cards, four hands of 13.
   - 4-round simultaneous passing rotation: Left $\rightarrow$ Right $\rightarrow$ Across $\rightarrow$ Hold.
   - 2♣ opens trick 1. Strict follow-suit enforcement.
   - First-trick penalty restrictions (no Hearts or Q♠ unless only penalty cards remain).
   - Hearts breaking rule (Q♠ alone does not break hearts).
   - Highest card of led suit takes trick.
   - 13 tricks per hand; 1 pt per Heart, 13 pts for Q♠.
   - Automatic Shoot the Moon detection (+26 pts to all 3 opponents).
   - 100-point match threshold; lowest score wins.

4. **Senior-Friendly AI Opponents (`js/ai.js`)**:
   - 3 distinct opponents: Michael (West), Jerry (North), Barbara (East).
   - Disciplined passing (sheds dangerous Q♠, high spades, high hearts, creates voids).
   - Unrushed, readable trick cadence (~550ms delay) with visible table card placement and turn glow.

5. **Usability & Offline PWA**:
   - **Review Last Trick**: 1-tap view of the previous trick from the Menu dialog.
   - **Autosave**: Continuous `localStorage` state serialization (`agy_hearts_state_v1`).
   - **Guarded Restart**: "New Match" requires explicit confirmation.
   - **Offline Play**: PWA manifest (`"orientation": "any"`) and Service Worker (`sw.js`).
   - **Web Audio**: Pleasant, gentle tactile sound effects with mute toggle.

---

## Project Structure

```
agy-hearts/
├── index.html            # Main game interface
├── css/
│   └── style.css         # High-contrast mobile stylesheet
├── js/
│   ├── card-glyphs.js    # Traced Didone numeral & suit vector SVGs
│   ├── engine.js         # Pure Hearts rules & state engine
│   ├── ai.js             # Computer opponent heuristics
│   └── app.js            # Controller, UI rendering, Web Audio & persistence
├── icons/
│   ├── icon-192.png      # 192px PWA icon
│   └── icon-512.png      # 512px PWA icon
├── apple-touch-icon.png  # 180px iOS home screen icon
├── manifest.json         # PWA configuration
├── sw.js                 # Service worker offline cache
├── test-hearts.mjs       # Playwright WebKit test suite
└── serve.py              # Local testing server (port 8768)
```

---

## Local Testing

* **Live URL**: `http://127.0.0.1:8768/`
* **Run automated WebKit tests**:
  ```bash
  node test-hearts.mjs
  ```
