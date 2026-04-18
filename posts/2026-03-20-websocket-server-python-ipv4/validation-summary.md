# Validation Summary: How to Create a WebSocket Server Bound to an IPv4 Address in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3 (asyncio)
- `websockets` library (Python WebSocket implementation)
- IPv4 socket binding
- WebSocket close codes (RFC 6455)
- POSIX signal handling (`SIGTERM`)

## Sources Consulted
- Official `websockets` library documentation: https://websockets.readthedocs.io/
- `websockets.serve` reference: https://websockets.readthedocs.io/en/stable/reference/asyncio/server.html
- Python `asyncio` event loop docs: https://docs.python.org/3/library/asyncio-eventloop.html
- Python `asyncio.get_event_loop()` / `get_running_loop()` deprecation notes (Python 3.10 / 3.12 changelogs)
- RFC 6455 (The WebSocket Protocol) — close codes, including 1001 "Going Away"
- `signal` module docs: https://docs.python.org/3/library/signal.html

## Issues Found
- **`asyncio.get_event_loop()` in the graceful shutdown example**: Calling `asyncio.get_event_loop()` from within a running coroutine is discouraged in Python 3.10+ and emits a `DeprecationWarning` in 3.12+ when no current loop exists. Since `main()` is invoked via `asyncio.run()`, the correct idiomatic call is `asyncio.get_running_loop()`. Changed `loop = asyncio.get_event_loop()` to `loop = asyncio.get_running_loop()`.

## Review Notes
- The modern `websockets` handler signature (single `websocket` parameter, no `path`) is used correctly. Older tutorials sometimes still show `async def handler(websocket, path):`, which is deprecated in `websockets` 11+.
- `from websockets.server import WebSocketServerProtocol` works and is correct for the legacy asyncio implementation. In `websockets` 13+, the new asyncio implementation at `websockets.asyncio.server` uses `ServerConnection` instead. Depending on which `serve` is aliased at the top-level in a given version, the runtime type may be `ServerConnection` rather than `WebSocketServerProtocol`. For this tutorial the type annotation is informational only and does not affect runtime behavior, so it was left as-is.
- `asyncio.gather(*[c.send(outgoing) for c in connected], return_exceptions=True)` is a reasonable broadcast pattern. The `websockets` library also provides `websockets.broadcast()` as a more efficient alternative; that's worth noting for readers but not an error.
- Close code `1001` ("Going Away") is appropriate for server-initiated shutdown per RFC 6455.
- `loop.add_signal_handler(signal.SIGTERM, stop.set_result, None)` is correct; note this is not supported on Windows, but the post does not claim cross-platform support.
