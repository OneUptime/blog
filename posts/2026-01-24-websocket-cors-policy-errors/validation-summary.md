# Validation Summary: How to Fix 'CORS Policy' WebSocket Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- WebSocket protocol
- Browser WebSocket API
- CORS
- Node.js
- ws
- Express.js
- Socket.io
- Nginx reverse proxying
- Vite development proxy
- Create React App development proxy
- http-proxy-middleware

## Sources Consulted
- MDN Web Docs: Writing WebSocket servers - https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
- RFC 6455: The WebSocket Protocol - https://datatracker.ietf.org/doc/html/rfc6455
- MDN Web Docs: Cross-Origin Resource Sharing - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- ws documentation - https://github.com/websockets/ws/blob/master/doc/ws.md
- Socket.IO: Handling CORS - https://socket.io/docs/v4/handling-cors/
- Socket.IO: Server options - https://socket.io/docs/v4/server-options/
- Socket.IO: Client options - https://socket.io/docs/v4/client-options/
- Nginx documentation: WebSocket proxying - https://nginx.org/en/docs/http/websocket.html
- Vite documentation: Server options / proxy - https://vite.dev/config/server-options
- Create React App documentation: Proxying API Requests in Development - https://create-react-app.dev/docs/proxying-api-requests-in-development/

## Issues Found
- The post incorrectly stated that native WebSocket handshakes are subject to CORS rules. Updated the explanation to clarify that native WebSockets do not use CORS preflight or `Access-Control-Allow-Origin`; browsers send an `Origin` header and servers may reject the handshake.
- The common error examples mixed native WebSocket origin rejection with true CORS errors. Updated the wording to distinguish WebSocket origin failures from Socket.io HTTP long-polling/API CORS failures.
- The `ws` examples used `verifyClient`, which current `ws` documentation discourages. Reworked the examples to validate origins in the HTTP server's `upgrade` event and then call `wss.handleUpgrade()`.
- The Socket.io server example configured CORS but did not restrict WebSocket transport requests. Added `allowRequest` origin validation because Socket.io documents that CORS only applies to HTTP long-polling, not WebSocket connections.
- The Nginx example reflected `$http_origin` while allowing credentials, which can allow arbitrary origins if not constrained. Changed the example to use an explicit allowed origin.
- The browser client section described failures as CORS errors and suggested checking response headers for native WebSockets. Updated it to describe origin/handshake failures and checking the handshake status code.
- The Socket.io browser client example used `extraHeaders` for authorization. Replaced it with the `auth` option because browser WebSocket clients cannot provide arbitrary custom headers when using WebSocket transport.
- The protocol mismatch example incorrectly implied `http://` frontend plus `wss://` WebSocket is the problem. Changed it to the real mixed-content issue: an HTTPS page using insecure `ws://`.
- The origin port example included `https://myapp.com:443` as an origin variant. Removed it and clarified that non-default ports should be listed when they are actually used.
- The conclusion overstated CORS as the cause of native WebSocket failures. Updated it to distinguish server-side origin validation from true CORS issues in polling/API requests.

## Review Notes
- Create React App is deprecated, but the proxy example remains technically valid for existing CRA applications.
- The Nginx CORS header example is illustrative. Production deployments with multiple allowed origins should use an explicit allowlist/map rather than reflecting arbitrary origins.
