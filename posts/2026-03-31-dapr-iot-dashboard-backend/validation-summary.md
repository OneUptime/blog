# Validation Summary: How to Build IoT Dashboard Backend with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (State Management, Pub/Sub)
- Python (Flask, dapr-client SDK)
- Node.js (ws WebSocket library, @dapr/dapr SDK)
- Redis (pub/sub backplane for horizontal scaling)
- WebSocket protocol

## Sources Consulted
- Dapr Python SDK source and examples: https://github.com/dapr/python-sdk
- Dapr JavaScript SDK source and API: https://github.com/dapr/js-sdk
- Dapr pub/sub documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/
- Dapr state management documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/
- Node.js `ws` library documentation: https://github.com/websockets/ws
- Python `json.loads()` documentation (bytes support since 3.6): https://docs.python.org/3/library/json.html
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **`serverPort` passed as number instead of string**: In the "Subscribe to Telemetry and Alerts" section, `new DaprServer({ serverPort: 3001 })` used a number. The `@dapr/dapr` SDK types `serverPort` as `string`. Changed to `"3001"`.

2. **`subscribe()` calls not awaited**: `daprServer.pubsub.subscribe()` returns `Promise<void>` and should be awaited to ensure subscriptions are registered before calling `start()`. Added `await` to both subscribe calls.

3. **Top-level `await` in CommonJS context**: The code uses `require()` (CommonJS modules) but had a bare `await daprServer.start()` at the top level, which would cause a SyntaxError in Node.js CommonJS modules. Wrapped the subscription setup and start call in an async IIFE `(async () => { ... })()`.

## Review Notes
- The Python code uses `get_state().data` which returns `bytes`, then passes it to `json.loads()`. This works correctly since `json.loads()` accepts `bytes` since Python 3.6. The `or '[]'` fallback also works because empty bytes (`b''`) is falsy, but mixing bytes and strings in `or` expressions is slightly unconventional.
- The `generateId()` function is referenced in the WebSocket server code but not defined. This is typical for tutorial snippets and is not a bug.
- The Redis backplane scaling section uses `redis-py` directly rather than going through Dapr, which is a valid architectural choice for internal WebSocket synchronization.
- The post correctly advises registering subscriptions before starting the Dapr server, which matches the SDK's documented usage pattern.
