# Validation Summary: How to Use WebSockets in React for Real-Time Applications

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- React
- TypeScript
- Browser WebSocket API
- Node.js `ws` WebSocket server library
- React Testing Library
- WebSocket reconnection, heartbeat, message queue, binary data, and throttling patterns

## Sources Consulted
- WHATWG WebSockets Standard: https://websockets.spec.whatwg.org/
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- MDN WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- MDN WebSocket `readyState`: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
- MDN WebSocket `binaryType`: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType
- MDN CloseEvent `code`: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
- MDN `keydown` event: https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
- MDN `keypress` event deprecation notice: https://developer.mozilla.org/en-US/docs/Web/API/Element/keypress_event
- TypeScript Utility Types documentation: https://www.typescriptlang.org/docs/handbook/utility-types.html
- Node.js Timers documentation: https://nodejs.org/api/timers.html
- `ws` package documentation and types: https://github.com/websockets/ws
- React Testing Library documentation: https://testing-library.com/docs/react-testing-library/intro/

## Issues Found
- Replaced deprecated `onKeyPress` handlers with `onKeyDown`, matching current browser keyboard event guidance.
- Changed frontend timer refs from `NodeJS.Timeout` to `ReturnType<typeof setTimeout>` or `ReturnType<typeof setInterval>` so the React/browser snippets do not require Node-specific timer types.
- Memoized derived options objects in backoff, heartbeat, and throttling hooks to avoid reconnect or resubscribe loops caused by new object identities on each render.
- Updated usage examples to memoize callback props with `useCallback`, preventing the shown hooks from reconnecting on every component render.
- Added cleanup for reconnect timers in queue and heartbeat examples so reconnect attempts do not continue after component unmount.
- Fixed the Node.js `ws` heartbeat handler to type message data as `RawData` and parse `message.toString()`, matching the library API.
- Removed unused variables in binary transfer snippets that would fail projects using `noUnusedLocals`.
- Corrected the WebSocket mock to define WebSocket ready-state constants after replacing the global WebSocket object.
- Aligned the test snippet with the actual `ChatComponent` UI by adding the placeholder to the component and updating assertions to check `Status: Connected` / `Status: Disconnected`.
- Encoded the auth token before appending it to the WebSocket URL and preserved existing query strings.

## Review Notes
The article is technically sound after the fixes. For production systems, passing auth tokens in query strings can expose them through logs and monitoring tools; subprotocol-based tokens, short-lived one-time tickets, or cookie-based auth may be preferable depending on the deployment model.
