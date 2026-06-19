# Validation Summary: How to Handle WebSocket in Next.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js custom server and App Router route handlers
- WebSocket and the browser `WebSocket` API
- `ws` Node.js WebSocket server library
- Socket.IO server and client
- Server-Sent Events and `EventSource`
- React hooks and Context API
- TypeScript

## Sources Consulted
- Next.js custom server docs: https://nextjs.org/docs/pages/guides/custom-server
- Next.js streaming in Route Handlers docs: https://nextjs.org/docs/app/guides/streaming
- Next.js route handler file convention docs: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Socket.IO guide for use with Next.js: https://socket.io/how-to/use-with-nextjs
- Socket.IO v4 Server API: https://socket.io/docs/v4/server-api/
- Socket.IO v4 Rooms docs: https://socket.io/docs/v4/rooms/
- React `useRef` docs: https://react.dev/reference/react/useRef
- React `useEffect` docs: https://react.dev/reference/react/useEffect
- MDN WebSocket API docs: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- MDN WebSocket `readyState` docs: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
- MDN EventSource docs: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- MDN Server-Sent Events guide: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN `String.prototype.substring()` docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- `ws` WebSocketServer docs: https://github.com/websockets/ws/blob/master/doc/ws.md

## Issues Found
- The custom WebSocket server broadcast and private-message examples sent `from: clientId`, while the chat component sent a username and compared incoming `from` values to `username`. Updated the server examples to use `message.data?.username || clientId` so the chat UI displays and compares the intended sender identity.
- The WebSocket hook used `useRef<NodeJS.Timeout>()` in client-side code and cleaned up by directly closing the socket, which could still trigger the reconnection branch on unmount. Updated the timeout ref to `ReturnType<typeof setTimeout> | null`, added explicit reconnect control, cleared pending timeouts, and changed the effect cleanup to call `disconnect()`.
- The WebSocket hook's `connect` callback depended on `onMessage`, `onConnect`, `onDisconnect`, and `onError`, so inline callback props could cause the connection effect to tear down and reconnect on normal renders. Moved those callbacks into a ref and removed them from the connection callback dependencies.
- The chat component used React's deprecated `onKeyPress` event. Replaced it with `onKeyDown` and renamed the handler accordingly.
- The client ID helper used deprecated `String.prototype.substr()`. Replaced it with `slice(2, 11)`.
- The Socket.IO room example named `io.sockets.adapter.rooms.get(room)` results `users`, but the adapter returns socket IDs. Renamed the variable and comment to `socketIds`.
- The SSE route could call `controller.close()` from both the interval limit and request abort handler. Added an idempotent `closeStream` helper so cleanup is safe if either close path runs first.
- The SSE hook could create multiple `EventSource` connections when `connect()` was called repeatedly, and inline callback props could cause reconnection on normal renders. It now closes the existing connection before opening a new one and stores message/error callbacks in a ref.
- The notification WebSocket URL interpolated `process.env.NEXT_PUBLIC_WS_URL` without a fallback, producing `undefined/notifications` when the env var is absent. Added the same localhost fallback used elsewhere in the post.

## Review Notes
- The overall architecture and API usage are current: custom Next.js HTTP server wiring, `ws` server setup, browser `WebSocket.readyState`, Socket.IO rooms, and App Router streaming responses are aligned with the consulted documentation.
- Socket.IO's official Next.js guide notes that custom servers remove some Next.js optimizations and cannot be deployed on Vercel. The post's approach is valid for self-hosted/custom Node.js deployments, but a future revision could make that deployment caveat explicit.
