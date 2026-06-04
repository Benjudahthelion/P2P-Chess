# ♞ P2P Professional Chess Client

A lightweight, high-performance, **zero-backend web application** designed for direct player-to-player chess matches. With no sign-ups, no databases, and no cloud accounts required, you can establish an instantaneous connection to play a secure, real-time match with friends, family, or rivals — even while on road trips, during commutes, or on local network connections!

---

## 🌟 Key Features

*   **True Peer-to-Peer Match Engine:** Direct, browser-to-browser synchronization powered securely by **WebRTC (via PeerJS)**. Your board state, timers, and moves pass directly to your partner with sub-millisecond network latency.
*   **Zero-Account Sign-up:** No emails, usernames, or passwords. Generate a quick **4-digit Room Code** to host a match, or enter an active room code to join.
*   **Fully Formatted Digital Chess Clocks:** Comprehensive support for classic time control presets:
    *   *Bullet:* `1 min`
    *   *Blitz:* `3 min` | `5 min`
    *   *Rapid:* `15 min`
    *   *Incremental Clocks:* `1+1` | `5+5`
    *   *Unlimited:* Practice mode or untimed friend matches.
*   **Local State Recovery:** Interrupted match? Closed tab? The engine preserves active matches in `localStorage`, letting you resume offline games or reconnect to active peer-to-peer room contexts seamlessly.
*   **Live Algebraic Move Log:** Tracks every actuation using official standard algebraic notation (SAN) paired neatly into columns matching professional chess notation sheets.
*   **Mobile-First Responsive Board:** Touch-optimized layout that auto-scales pieces perfectly to fit mobile screens as well as ultra-wide monitors, preserving a perfect $1:1$ aspect ratio.
*   **Procedural Web Audio Effects:** Crystal-clear tones for standard moves, captured pieces, check warnings, and checkmate alerts synthetically generated directly inside your browser.

---

## 🛠️ Tech Stack

This application is built as a highly robust, modular monolithic application utilizing a strict, front-end only static architecture:

*   **Chess Engine Logic:** [chess.js](https://github.com/jhlywa/chess.js) (v0.10.3) for coordinate tracking, validation, castling rights, en passant, threefold repetition, and legal move highlights.
*   **P2P Network Routing:** [PeerJS](https://peerjs.com/) CDN broker layer to establish direct WebRTC peer connections.
*   **User Interface & Styling:** Vanilla HTML5 Canvas layout styled with flexible CSS3 flexbox structures, featuring custom SVG vector chess sets.

---

## 🚀 How to Run Locally

Since this app executes entirely in the client's browser, you do not need any backend setup (like Node.js servers, SQL configurations, or cloud gateways) to get it running.

### Option 1: Live Server (Recommended for development)
1.  Ensure you have **VS Code** installed.
2.  Install the **Live Server** extension by Ritwick Dey.
3.  Clone or download this project's files into a local folder.
4.  Right-click `index.html` inside VS Code and select **"Open with Live Server"**.
5.  The app will load instantly on `http://127.0.0.1:5500`.

### Option 2: Running with Node.js
If you prefer a terminal-based static file server, launch a simple zero-configuration server:
```bash
# Using npx
npx http-server -p 3000

# Or using python
python -m http.server 3000
```
Open your browser of choice and go to `http://localhost:3000`.

---

## 🎮 How to Play

### Hosting a Match (White)
1.  Open the application of your choice on your browser.
2.  In the **P2P Match Engine** control panel, choose your preferred timer format from the dropdown menu (e.g., `Blitz: 5 min`).
3.  Click the **Host** or **Host Online Room** button.
4.  Copy the generated **4-digit numeric room code** and send it directly to your opponent.
5.  Sit back and wait for them to join! The game clock starts automatically when the first piece moves.

### Joining a Match (Black)
1.  Enter the 4-digit code provided to you by the host in the **Room Code Input** box.
2.  Click **Join** or **Join Online Match**.
3.  Your board will automatically flip so the Black pieces face you.
4.  Once the WebRTC handshake completes, White is cleared to initiate the match!

*Note: If no connection is established, you can use the application entirely offline in **Practice Mode**, enabling you to play moves for both White and Black sides to study opening lines and solve puzzles.*

---

## ⚖️ License

Distributed under the MIT License. Feel free to copy, modify, and distribute this codebase for educational and personal entertainment matches.

```text
The MIT License (MIT)

Copyright (c) 2026 P2P Chess Client Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```
