# Validation Summary: How to Build WebSocket Clients in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (3.10+)
- `websockets` library (new asyncio implementation, v14+)
- `asyncio` standard library
- `ssl` standard library / `certifi`
- `pytest` and `pytest-asyncio` for testing
- `unittest.mock` (`AsyncMock`, `patch`) for mocking
- WebSocket protocol concepts (RFC 6455): handshake, ping/pong, close codes

## Sources Consulted
- websockets official documentation (stable): https://websockets.readthedocs.io/en/stable/
- websockets asyncio client reference: https://websockets.readthedocs.io/en/stable/reference/asyncio/client.html
- websockets exceptions reference: https://websockets.readthedocs.io/en/stable/reference/exceptions.html
- websockets upgrade/migration guide: https://websockets.readthedocs.io/en/stable/howto/upgrade.html
- websockets on PyPI: https://pypi.org/project/websockets/
- Python `datetime` documentation (deprecation of `datetime.utcnow()` in 3.12)

## Issues Found

1. **Invalid `websockets[speedups]` extras (Installation section).** The post recommended `pip install websockets[speedups]` "for additional features like SSL certificate handling". No such extras exists for the `websockets` package; the claim appears to confuse it with `aiohttp[speedups]`. SSL is provided by Python's stdlib `ssl` module. Rewrote the section to drop the bogus extras and mention `certifi` separately as the standard CA-bundle option, which matches what the SSL section actually uses.

2. **`extra_headers` → `additional_headers` (Authentication section, two examples).** The new asyncio implementation (default for `websockets.connect()` since v14.0) renamed the keyword argument from `extra_headers` to `additional_headers`. Updated both the Bearer-token and Basic-auth examples.

3. **`InvalidStatusCode` → `InvalidStatus` (Error handling section).** `InvalidStatusCode` is a legacy-only exception in the new asyncio implementation; the current exception is `InvalidStatus`, which exposes the underlying response via `e.response.status_code` (not `e.status_code`). Updated the import, the except clause, and the print statement. Also reordered the except blocks so `InvalidStatus` is caught before its parent `InvalidHandshake` (otherwise the parent would shadow it).

4. **`.open` property removed in new asyncio API (Reconnecting client and Heartbeat client).** The `connection.open` boolean property is gone in the new asyncio implementation; the documented replacement is to call `send()`/`recv()` and handle `ConnectionClosed`. Rewrote `ReconnectingWebSocket.send()` to try-send and catch `ConnectionClosed`, and removed the `.open` guard from `HeartbeatClient._heartbeat_loop` (it now relies on the existing `ConnectionClosed` handler).

5. **`datetime.utcnow()` deprecated in Python 3.12 (Heartbeat, Live data, and Chat client examples).** Replaced all five call sites with `datetime.now(timezone.utc)` and updated the three relevant `from datetime import ...` lines to also import `timezone`. The resulting timestamps are timezone-aware, which is consistent with `datetime.fromisoformat()` parsing the same value back in the heartbeat latency calculation.

6. **Test mocking pattern would not actually run (Testing section).** `patch('websockets.connect', return_value=mock_ws)` makes `await websockets.connect(...)` await a non-awaitable `MockWebSocket` instance, which raises `TypeError`. Changed all three unit-test patches to `patch('websockets.connect', new=AsyncMock(return_value=mock_ws))` so the awaited call resolves to the mock. (`AsyncMock` is already imported in the snippet.)

## Review Notes

- The blog uses `import websockets` then writes `websockets.ConnectionClosed`. This works because `websockets/__init__.py` re-exports the exceptions at the top level, but if a reader follows the documentation's preferred style they would normally write `from websockets.exceptions import ConnectionClosed`. Not incorrect, just stylistic.
- The `bidirectional_client.py` snippet imports `from datetime import datetime` but never uses it. Harmless dead import; left as-is to avoid stylistic edits.
- In the `bidirectional_client.py` `main()`, `client_task = asyncio.create_task(client.run())` is created but never awaited or cancelled before `client.disconnect()`. In practice `asyncio.run()` will cancel it on shutdown, so it works for the demo; in production code you would `await client_task` (or `await asyncio.wait(...)`). Not a correctness bug in the snippet's stated purpose.
- `websockets.serve(handler, ...)` in the integration test uses the modern single-argument handler signature (`async def handler(websocket)`), which is correct for current versions of the library.
- Protocol-level ping/pong is indeed handled automatically by the `websockets` library when `ping_interval` is set (the default is 20 seconds), so the post's claim that application-level heartbeats are only needed for some servers/proxies is accurate.
