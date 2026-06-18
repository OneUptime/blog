# Validation Summary: How to Fix 'Connection Refused' WebSocket Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- WebSocket protocol
- Node.js and the `ws` package
- Python `websockets`
- Linux networking tools: `ss`, `netstat`, `lsof`, `nc`
- Linux firewalls: iptables, UFW, firewalld
- Windows Firewall PowerShell
- Docker and Docker Compose
- NGINX reverse proxying
- Browser WebSocket API

## Sources Consulted
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- `ws` WebSocketServer documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Python `websockets` asyncio server documentation: https://websockets.readthedocs.io/en/stable/reference/asyncio/server.html
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Dockerfile `EXPOSE` reference: https://docs.docker.com/reference/dockerfile/#expose
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/#version-top-level-element-obsolete
- npm `ci` documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- MDN CloseEvent code reference: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The Mermaid cause list included "Network unreachable" under connection refused causes. Network unreachable is a different low-level failure mode, so it was changed to "Firewall or proxy rejecting."
- The Node.js graceful shutdown example called `wss.close()` without closing existing WebSocket clients. The `ws` documentation states existing connections are not closed automatically, so a loop was added to close tracked clients with code `1001`.
- The Python `websockets` example used the older two-argument handler signature. Current `websockets.asyncio.server.serve` passes a single `ServerConnection`, so the import and handler signature were updated.
- The Dockerfile used `npm ci --only=production`. Current npm documentation describes dependency omission with `--omit=dev`, so the command was updated.
- The Compose example included the obsolete top-level `version` field. Docker Compose now treats it as informational and warns when it is used, so it was removed and the comment was updated to `compose.yaml`.
- The browser client retry example did not reject the `connect()` promise when the WebSocket closed before opening, so the usage `.catch()` path would not run on an initial refused connection. A `settled` flag and pre-open close rejection were added.
- The diagnostic script used `curl -I`, which sends a `HEAD` request. WebSocket opening handshakes use `GET`, so the command was changed to `curl -si -N -m 5 --http1.1` with the same upgrade headers.

## Review Notes
The NGINX example is technically valid. Newer NGINX documentation notes `proxy_http_version 1.1` was required before version 1.29.7, but keeping it remains compatible and common for deployments that may run older NGINX versions.
