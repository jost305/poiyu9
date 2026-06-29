# BOTA Arena

A 2D automated fighting game with a futuristic robot-themed aesthetic. Features a Phaser-based combat simulation with a live betting and social HUD platform for "agent" battles.

## Tech Stack
- **Backend:** Node.js + Express + Socket.io
- **Frontend:** Phaser 3 (v3.86.0), HTML5/CSS3, Vanilla JavaScript
- **Port:** 5000

## Running the App
```
npm start
```

## Project Structure
- `server/` — Express + Socket.io server
- `game/` — Frontend assets, Phaser scenes, HTML HUD
  - `index.html` — Main entry point and UI
  - `src/` — Game logic (BattleScene.js, Fighter.js, game.js)
  - `images/` — Sprite assets for fighters and FX
  - `styles/` — CSS stylesheets

## User Preferences
- No external auth — the game has no login flow
- No external API integrations
