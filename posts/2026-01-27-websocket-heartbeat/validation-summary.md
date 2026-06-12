# Validation Summary: How to Implement Heartbeat/Ping-Pong in WebSockets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol (RFC 6455) — ping/pong control frames (opcodes 0x9 / 0xA)
- Node.js with the `ws` library (server and client)
- Browser WebSocket API (including Network Information API, Page Visibility API)
- Python `websockets` library (asyncio-based server)
- Go `gorilla/websocket` package (hub/client pump pattern)
- TCP keep-alive (Linux defaults)
- Reverse proxies / load balancers: AWS ALB, NGINX, Cloudflare, Azure Application Gateway
- Mermaid diagrams (sequence, flowchart)

## Sources Consulted
- RFC 6455 (The WebSocket Protocol) — control frame opcodes
- `ws` library docs (https://github.com/websockets/ws) — `ping()`, `terminate()`, `clients`, `pong` event, automatic pong response behavior
- `websockets` Python library docs (https://websockets.readthedocs.io/) — `serve()` parameters `ping_interval`/`ping_timeout`, `WebSocketServerProtocol`, `remote_address`
- `gorilla/websocket` Go docs (https://pkg.go.dev/github.com/gorilla/websocket) — `Upgrader`, `SetPongHandler`, `SetReadDeadline`, `IsUnexpectedCloseError`, message type constants
- MDN — `WebSocket` API, `navigator.connection` / `NetworkInformation.effectiveType`, `online`/`offline` events, `visibilitychange`
- Linux kernel docs / `man tcp(7)` — `tcp_keepalive_time` default (7200s)
- AWS ALB documentation — default idle timeout (60s)
- NGINX docs — `proxy_read_timeout` default (60s)
- Cloudflare documentation — WebSocket / HTTP response timeout (100s on Free/Pro)
- Microsoft Azure docs — Application Gateway TCP idle timeout default (4 minutes / 240 seconds)

## Issues Found
1. **Azure Application Gateway timeout value was incorrect.** The post claimed the Azure Application Gateway default timeout is 60 seconds (with a 55-second heartbeat). The actual default TCP idle timeout for Azure Application Gateway is 4 minutes (240 seconds). Updated the comment to reflect the correct 240-second TCP idle timeout and increased the heartbeat value from `55000` to `220000` so it remains comfortably shorter than the real proxy timeout.

## Review Notes
- **Python `websockets` library — deprecation notice (not fixed):** `from websockets import WebSocketServerProtocol` and the top-level `websockets.serve()` call shown in the post use the legacy asyncio implementation. Since `websockets` 14.0, this API is deprecated in favor of `websockets.asyncio.server.serve` with `ServerConnection`. The legacy API still works (and remains importable, with deprecation warnings expected), so the post is functionally correct, but readers writing new code in 2026+ may wish to migrate to `websockets.asyncio.server`. Left unchanged because (a) the code works as written, and (b) rewriting to the new API would constitute a structural change beyond the scope of a technical correction.
- **gorilla/websocket maintenance status (not fixed):** `github.com/gorilla/websocket` is still the correct import path and the code is accurate. The package has been in maintenance mode since the gorilla organization archived its projects in late 2022; many teams now prefer `coder/websocket` (formerly `nhooyr.io/websocket`). The post doesn't make any claim about maintenance status, so no change is required.
- **`navigator.connection` browser support:** The Network Information API is only fully supported in Chromium-based browsers; Firefox and Safari do not implement it. The post's `'connection' in navigator` guard is correct and handles this gracefully.
- **Jitter terminology:** `ConnectionHealthMonitor.getJitter()` returns the population standard deviation of latency samples, while the inline comment calls this "latency variance." These are different mathematically (variance = std-dev squared), but standard deviation is a common and acceptable proxy for jitter in application-level monitoring. Left unchanged — minor terminology nit, not a functional issue.
- All other code samples (Node.js `ws` server/client, Browser `WebSocketClient` class, Go gorilla hub/client pumps with `pingPeriod = (pongWait * 9) / 10`, etc.) follow established, current best practices and match the official library APIs.
