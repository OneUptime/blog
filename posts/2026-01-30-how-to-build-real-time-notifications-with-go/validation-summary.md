# Validation Summary: How to Build Real-Time Notifications with Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- net/http
- WebSockets
- gorilla/websocket
- Server-Sent Events
- Redis Pub/Sub
- go-redis/v9

## Sources Consulted
- Go net/http package documentation: https://pkg.go.dev/net/http
- gorilla/websocket package documentation: https://pkg.go.dev/github.com/gorilla/websocket
- go-redis/v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/pubsub/
- go-redis Pub/Sub guide: https://redis.uptrace.dev/guide/go-redis-pubsub.html
- HTML Standard, Server-sent events: https://html.spec.whatwg.org/multipage/server-sent-events.html

## Issues Found
- The hub broadcast loop deleted clients from the `clients` map while holding an `RLock`. This is not safe because deleting from a map is a write. Changed that broadcast path to use `Lock`/`Unlock`.
- The final `main` example called `serveWebSocket`, but the post did not define it. Added a minimal `serveWebSocket` implementation with separate read and write pumps so messages are delivered through the client's send channel and the Gorilla WebSocket one-reader/one-writer rule is respected.
- `SendToUser` ignored JSON marshaling errors. Changed it to return an error when marshaling fails.
- The Redis subscription loop ignored errors from `BroadcastNotification`. Added logging for broadcast failures.
- The `/notify` handler ignored Redis publish errors. Added an HTTP 500 response path when publishing fails.

## Review Notes
The SSE example is intentionally simplified and would still need a real client manager to publish messages into each client's channel in production. The WebSocket origin check is acceptable for development as written, and the post already notes that origins should be restricted in production.
