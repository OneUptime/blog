# Validation Summary: How to Handle Connection Limits in WebSockets

## Status
validated

## Post Type
Tutorial / Guide — practical multi-language implementation guide covering connection tracking, graceful rejection, load shedding, queuing, and monitoring.

## Technologies Covered
- Node.js (`ws` library, `prom-client`)
- Python (asyncio, FastAPI / Starlette, `dataclasses`)
- Go (`sync.RWMutex`, standard library)
- WebSocket protocol (RFC 6455, IANA close codes)
- Prometheus (metrics, alerting rules)
- HTTP status codes (429, 503) and `Retry-After` semantics

## Sources Consulted
- Python `datetime` docs — deprecation of `datetime.utcnow()` in Python 3.12 (https://docs.python.org/3/library/datetime.html)
- Starlette WebSockets docs — close-before-accept behavior (https://www.starlette.io/websockets/)
- IANA WebSocket Close Code Number Registry — semantics of code 1013 (https://www.iana.org/assignments/websocket/websocket.xhtml)
- MDN `CloseEvent.code` — close-code reference (https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code)
- MDN `String.prototype.substr()` — deprecation note (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr)
- `siimon/prom-client` README — current Registry / Gauge / Counter / Histogram API (https://github.com/siimon/prom-client)
- `websockets/ws` docs — `WebSocketServer` / `handleUpgrade` API (https://github.com/websockets/ws/blob/master/doc/ws.md)
- Go `sync` package docs — `RWMutex` usage (https://pkg.go.dev/sync#RWMutex)

## Issues Found

1. **Python `datetime.utcnow()` is deprecated (Python 3.12+).** The `ConnectionMetadata` dataclass used `default_factory=datetime.utcnow` for `connected_at` and `last_activity`. `datetime.utcnow()` is deprecated since Python 3.12 and scheduled for removal; it also returns a naive datetime which is misleading for a UTC timestamp.
   - **Fix:** Added `timezone` to the imports and replaced both factories with `lambda: datetime.now(timezone.utc)`, which returns a timezone-aware UTC datetime and is the documented replacement.

2. **FastAPI/Starlette `websocket.close(code=1013)` called before `accept()` does NOT send a WebSocket close frame.** The original code rejected the connection by calling `await websocket.close(code=1013, reason=...)` without first accepting. In Starlette, calling `close()` before `accept()` causes the server to respond to the HTTP upgrade with a plain HTTP 403, so the client never sees close code 1013 — defeating the purpose of choosing that code. To actually transmit close code 1013 to the client, the handshake must complete first.
   - **Fix:** Added `await websocket.accept()` before the `websocket.close(code=1013, reason=...)` call, with a code comment explaining the Starlette behavior so a reader understands why the accept-then-close pattern is required.

## Review Notes
- `Math.random().toString(36).substr(2, 9)` uses the legacy `String.prototype.substr()` method, which is deprecated (Annex B) but still works in all current engines. Left as-is because it is not technically broken; a future cleanup could swap to `.slice(2, 11)`.
- The post uses `new WebSocket.Server({ noServer: true })`. The `ws` library now canonicalizes the export as `WebSocketServer`, but `WebSocket.Server` is still kept as a back-compat alias and works identically. Left as-is.
- Close code 1013 ("Try Again Later") is not in RFC 6455 itself but is a registered IANA close code and is widely supported by browsers and major server libraries. The post's wording is accurate.
- The 2–4KB per-connection memory estimate is in the right order of magnitude for a minimal WebSocket connection; real-world overhead is usually higher once application state, TLS buffers, and event-loop bookkeeping are included, but the post correctly notes "at minimum, plus any application state."
- The `LoadShedder.getConnectionsToShed()` method iterates `this.tracker.connections` directly (the underlying `Map`), which assumes the tracker exposes it as a public field — which `ConnectionTracker` does. Internally consistent.
- Prometheus alert thresholds (80% warning / 95% critical) are reasonable defaults; readers should still tune based on workload characteristics, as noted in the post.
