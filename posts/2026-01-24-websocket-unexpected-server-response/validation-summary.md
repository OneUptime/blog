# Validation Summary: How to Fix 'Unexpected Server Response' WebSocket Errors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol and HTTP Upgrade handshake
- Node.js HTTP server upgrade handling
- Node.js `ws` WebSocket client and server library
- Express HTTP routing
- Nginx WebSocket reverse proxy configuration
- curl-based HTTP handshake testing
- Python `websockets` asyncio server API
- Browser WebSocket Origin validation

## Sources Consulted
- RFC 6455: The WebSocket Protocol - https://datatracker.ietf.org/doc/html/rfc6455
- Node.js HTTP API documentation: `upgrade` event - https://nodejs.org/api/http.html
- `ws` API documentation - https://github.com/websockets/ws/blob/master/doc/ws.md
- Nginx documentation: WebSocket proxying - https://nginx.org/en/docs/http/websocket.html
- curl CLI help output for `--head`, `--include`, `--no-buffer`, and `--header`
- Python `websockets` 16.0 documentation: asyncio server API - https://websockets.readthedocs.io/en/stable/reference/asyncio/server.html
- Python `websockets` 16.0 documentation: data structures and request headers - https://websockets.readthedocs.io/en/stable/reference/datastructures.html
- Python `websockets` 16.0 documentation: routing by request path - https://websockets.readthedocs.io/en/stable/topics/routing.html

## Issues Found
- The curl proxy test used `curl -I`, which sends a HEAD request. RFC 6455 requires the opening handshake to use GET, so the command was changed to use curl's default GET with `-i -N --http1.1 --max-time 5`.
- The Nginx comment claimed missing proxy upgrade headers make Nginx return 400. Official Nginx documentation says the key issue is that hop-by-hop `Upgrade` and `Connection` headers are not passed to the upstream unless set explicitly, so the comment was corrected.
- The browser section described the issue as CORS/preflight handling and used `verifyClient`. WebSocket browser connections do not use CORS preflights, and `ws` discourages `verifyClient`; the section was corrected to Origin validation handled in the HTTP server `upgrade` event.
- The Node.js redirect example combined `followRedirects: true` with manual `unexpected-response` redirect handling. In `ws`, `followRedirects` follows redirects directly and emits a `redirect` event, so the example was simplified to the documented option and event.
- Several JavaScript examples declared the same `const` names more than once in a single code block. Variable names were adjusted so each code block parses as JavaScript.
- The Python `websockets` example used the legacy handler and `process_request` signatures. It was updated to the current asyncio API, where `serve()` is imported from `websockets.asyncio.server`, the handler receives a single connection object, and `process_request` receives `(connection, request)`.
- Remaining diagnostic text that referred to CORS for 403 responses was updated to Origin/access-policy wording.

## Review Notes
- Extracted JavaScript code blocks pass `node --check` syntax validation.
- The Python code block passes Python AST syntax validation.
- Runtime checks requiring live WebSocket endpoints were not executed; protocol behavior was verified against RFC 6455 and the official library/server documentation.
