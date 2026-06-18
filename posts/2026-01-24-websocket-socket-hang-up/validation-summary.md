# Validation Summary: How to Fix 'Socket Hang Up' WebSocket Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- WebSocket protocol
- Node.js HTTP server APIs
- Node.js `ws` WebSocket library
- Python `websockets` library
- Nginx reverse proxy configuration
- Bash networking diagnostics with `nc`, `openssl`, `curl`, and `wscat`

## Sources Consulted
- RFC 6455: The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- Node.js HTTP server documentation: https://nodejs.org/api/http.html
- `ws` API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Python `websockets` asyncio client documentation: https://websockets.readthedocs.io/en/stable/reference/asyncio/client.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Debian `wscat` man page: https://manpages.debian.org/testing/node-ws/wscat.1.en.html
- Local CLI help/version checks for Node.js 22.22.0, Python 3.12.3, OpenBSD netcat, curl 8.5.0, and OpenSSL 3.0.13

## Issues Found
- The first JavaScript snippet declared `WebSocket` and `wss` twice in the same code block, which made the combined snippet syntactically invalid and not independently runnable. I split the BAD and GOOD examples into separate JavaScript fences and changed the BAD example server variable to `badWss`.
- The global `uncaughtException` handler advised logging and continuing. Node.js applications should treat uncaught exceptions as a last-resort cleanup path because the process may be in an undefined state. I updated the comments and sample behavior to close clients with code `1011` and set a non-zero exit code.
- The resource exhaustion example said `maxPayload` limited max connections. `maxPayload` limits incoming message size, so I corrected the comment.
- The HTTP timeout comments implied all listed Node.js timeouts directly affect established WebSocket traffic. I clarified that they affect the HTTP handshake and underlying upgraded socket behavior.
- The Nginx example used `proxy_connect_timeout 7d`, but Nginx documents this as a connection-establishment timeout and notes it usually cannot exceed 75 seconds. I changed it to `60s` and kept long `proxy_send_timeout` and `proxy_read_timeout` values for long-lived WebSocket traffic.
- The heartbeat section mixed server protocol-level ping frames with a browser client that sends application-level `"ping"` messages. Browser JavaScript cannot send protocol ping frames, so I added a server-side message handler that responds to application-level `"ping"` with `"pong"`.
- The comprehensive logging snippet set `process.env.DEBUG = 'ws'`, which isn't documented by `ws` as a debugging mechanism and was set after requiring the module. I removed those lines and kept explicit application-level logging.
- The `ws` close event reason is a `Buffer` in Node `ws`. I changed the logging example to call `reason.toString()`.
- The WebSocket upgrade diagnostic used `curl -sI`, which sends a HEAD request rather than the GET request required for the WebSocket opening handshake. I changed it to `curl --http1.1 -i -N --max-time 5` with the upgrade headers.

## Review Notes
The logging example accesses `ws._socket`, which is an internal implementation detail rather than a public `ws` API. It is acceptable for a debugging-oriented snippet, but a production guide could note that this is diagnostic-only. All edited JavaScript snippets pass `node --check`, the Python snippet compiles with Python 3.12, and the Bash snippet passes `bash -n`.
