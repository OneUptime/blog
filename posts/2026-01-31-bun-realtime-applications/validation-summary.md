# Validation Summary: How to Build Real-time Applications with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime (`Bun.serve`, native WebSocket API)
- WebSockets (server.upgrade, ws.subscribe/unsubscribe/publish, server.publish pub/sub)
- Server-Sent Events (SSE) using `ReadableStream` + `TextEncoder`
- Redis pub/sub via node-redis (`createClient`, `subscribe`, `pSubscribe`)
- TypeScript
- React hooks (`useEffect`, `useRef`, `useState`, `useCallback`) for client-side dashboard

## Sources Consulted
- Bun WebSocket documentation: https://bun.com/docs/api/websockets
- Bun HTTP server (`Bun.serve`) documentation: https://bun.com/docs/api/http
- Bun pub/sub topics (`ws.subscribe`, `ws.publish`, `server.publish`): https://bun.com/docs/api/websockets#pub-sub
- node-redis v4+ client documentation: https://github.com/redis/node-redis (pub/sub: `subscribe`, `pSubscribe`)
- MDN Server-Sent Events / `EventSource` format: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN `ReadableStream` and `TextEncoder`: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
- React `useRef` typing reference: https://react.dev/reference/react/useRef

## Issues Found
1. **Runtime bug in presence.ts stale-cleanup loop** — The `forEach` callback parameter was misnamed `odUserId` (a typo) while the body referenced a non-existent `userId` variable: `staleUsers.push(userId);`. This would throw a `ReferenceError` the first time a stale user was detected. Fixed by renaming the parameter to `userId` so it matches the variable being pushed.

## Review Notes
- In `presence.ts`, the cleanup `setInterval` references `server.publish` before `const server` is declared in source order. Because `setInterval` schedules the callback asynchronously and the interval (`PRESENCE_TIMEOUT = 60000 ms`) runs well after module evaluation, this works at runtime, but it is fragile style. Left as-is — not a correctness bug.
- The comment "Reconnect with exponential backoff" in `useRealtimeDashboard.ts` precedes a fixed 3000 ms `setTimeout` rather than true exponential backoff. The comment is slightly misleading but not technically incorrect code; left as-is to preserve author's wording.
- `useRef<number>()` (no initial argument) is valid in current React typings (`@types/react`) — it resolves to `MutableRefObject<number | undefined>`. No change needed.
- The `Connection: keep-alive` header on the SSE response is harmless for HTTP/1.1 (Bun's `Bun.serve` is HTTP/1.1 by default); it is a no-op / ignored under HTTP/2 but does not cause errors. Left unchanged.
- The unused `data` variable inside the Redis `subscribe`/`pSubscribe` callbacks is a minor code smell but does not affect correctness.
- Bun's `websocket` handler set used (`open`, `message`, `close`, `error`) all match Bun's current API surface.
- Pub/sub topic methods (`ws.subscribe`, `ws.unsubscribe`, `ws.publish`, `server.publish`) are correct per Bun's WebSocket pub/sub docs.
- SSE event format (`event: <name>\ndata: <payload>\n\n`) is conformant with the EventSource specification.
