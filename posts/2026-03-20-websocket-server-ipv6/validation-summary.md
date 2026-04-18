# Validation Summary: How to Configure WebSocket Servers with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol (RFC 6455)
- IPv6 addressing (RFC 4291)
- Node.js `ws` library
- Node.js `https` module
- Python `websockets` library (async)
- `wscat` CLI
- `curl` (WebSocket upgrade)
- `ip6tables` / `ufw` firewall tools

## Sources Consulted
- [`ws` npm package](https://www.npmjs.com/package/ws) and [GitHub repo](https://github.com/websockets/ws) — server options (`host`, `port`), `listening` event, `address()` method
- [Node.js `https` docs](https://nodejs.org/api/https.html) — `server.listen(port, host, callback)` signature
- [Python `websockets` docs (v12)](https://websockets.readthedocs.io/en/12.0/) — `serve()`, handler signature, `remote_address` tuple shape, `ConnectionClosed` exception, `async with` pattern
- [`wscat` GitHub repo](https://github.com/websockets/wscat) — IPv6 URL syntax with bracketed literals
- [RFC 4291 — IPv6 Addressing Architecture](https://www.rfc-editor.org/rfc/rfc4291.html) — IPv4-mapped IPv6 address format `::ffff:x.x.x.x`

## Issues Found
No technical issues found.

## Review Notes
- Dual-stack behavior of binding to `::` depends on the OS default for `IPV6_V6ONLY` (Linux defaults to dual-stack; Windows/FreeBSD typically default to IPv6-only). The post's comment ("accepts both IPv4 and IPv6 on most systems") reflects this reasonably.
- The Python handler signature `async def handler(websocket):` (without `path`) is the modern form — valid in `websockets` 11+ where `path` was deprecated and removed from the default signature.
- `await asyncio.Future()` is a common idiom for "run forever"; alternatives like `server.serve_forever()` or `asyncio.Event().wait()` are equally valid but not required.
- The `curl` example demonstrates a manual upgrade handshake (the `Sec-WebSocket-Key` is the canonical example from RFC 6455); it establishes the upgrade but won't perform a full interactive WebSocket session — this is fine for the stated "with curl (WebSocket upgrade)" purpose.
