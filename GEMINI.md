# Antigravity Workspace Directives for Shawn Hanna

## 1. Repository & Build Directory Standard
- **Primary Project Monorepo**: All card games, web apps, tools, design comparisons, reviews, and product case studies built by Antigravity MUST be placed in the `/agy/` directory:
  - Local path: `/Users/shawnmac/agy/` (or `~/agy/`)
  - Git remote: `origin` -> `https://github.com/sghanna/agy.git` (`sghanna/agy`, branch `main`)
  - Live GitHub Pages: `https://sghanna.github.io/agy/`
- **Never Build in Other Repositories**: Do NOT place new builds, case studies, or reviews into `/codex/`, `~/mom-games/`, or other directories unless Shawn explicitly directs otherwise for a specific one-off task.

## 2. Directory Structure in `~/agy/`
```
/Users/shawnmac/agy/
├── index.html            # Unified Game Hub Portal
├── README.md             # Repository documentation & case study index
├── solitaire/            # Klondike Solitaire PWA & CASE-STUDY.md / case-study.html
├── hearts/               # Hearts card game PWA & CASE-STUDY.md
├── portfolio/            # High-level product & design leadership case studies
├── reviews/              # Interactive visual review comparisons (card opacity, turn cues, red ink, etc.)
└── <future-games>/       # Euchre, Word Games, etc.
```

## 3. Git & Publication Workflow
- When building or updating features, case studies, or design comparisons, commit and push to `github.com/sghanna/agy` (`main`).
- Always verify working tree status before and after commits.
