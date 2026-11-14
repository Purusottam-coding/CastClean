# CastClean — Zero-Delay P2P Screen Sharing

**CastClean** is a zero-delay, peer-to-peer (P2P) screen-sharing web application built with React, Vite, Tailwind CSS, and WebRTC (via PeerJS). Unlike traditional screen-sharing tools that upload, transcode, and relay video through intermediate media servers (SFUs/MCUs), CastClean streams audio and video directly between browsers with granular privacy and gatekeeper controls.

---

## Key Features

1. **Direct P2P WebRTC Streaming:**
   - Zero media relay or intermediate transcoder.
   - Ultra-low latency (typically sub-50ms) over encrypted DTLS/SRTP UDP channels.
   - 60 FPS crystal clear display streaming with `getDisplayMedia`.

2. **Privacy Lobby Gatekeeper:**
   - 6-character room code discovery prefixed with `castclean-` (e.g. `castclean-K7M9P2`).
   - Viewers connect over a reliable DataChannel and send a `REQUEST_ACCESS` knock payload.
   - If **Require approval before viewing** is enabled, the Host explicitly approves or declines incoming viewers before any media bytes flow.

3. **Zero-Leak Privacy Curtain (Track Replace):**
   - Instant 1-click toggle or keyboard shortcut (`P`).
   - Uses `RTCRtpSender.replaceTrack()` to swap the screen track with a synthetic high-resolution privacy canvas.
   - Zero frozen pixel leaks, zero decoder stutter, and instant resumption without WebRTC renegotiation delay.

4. **Zero-Jitter Viewer Player:**
   - Fullscreen & Picture-in-Picture (PiP) modes.
   - Real-time WebRTC telemetry HUD (RTT latency, FPS, resolution, bitrate, packet loss).
   - Audio volume slider with browser autoplay policy block recovery.

5. **Real-Time Interactive DataChannel:**
   - Low-latency chat between host and viewers.
   - Floating live emoji reactions (`👍`, `🔥`, `👏`, `💡`, `❓`, `❤️`).

---

## Getting Started

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```
