# Validation Summary: How to Build a Real-Time Notification System with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Change Streams, TTL indexes, compound indexes)
- Node.js
- MongoDB Node.js Driver (v4+)
- Express.js
- Server-Sent Events (SSE)
- EventSource browser API

## Sources Consulted
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Node.js Driver API (Collection.find, watch): https://www.mongodb.com/docs/drivers/node/current/
- MDN EventSource API: https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource
- MDN Server-Sent Events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Express.js API documentation: https://expressjs.com/en/api.html

## Issues Found

1. **Tags listed "WebSocket" but the post uses SSE**: The metadata tags included "WebSocket" but the entire implementation uses Server-Sent Events (SSE), not WebSocket. Changed the tag from "WebSocket" to "SSE" to match the actual content.

2. **`EventSource` does not support custom headers**: The frontend client code passed `{ headers: { Authorization: ... } }` as the second argument to the `EventSource` constructor. The native browser `EventSource` API only accepts `{ withCredentials: boolean }` as the second parameter — custom headers are silently ignored. Fixed by passing the auth token as a query parameter instead (`?token=...`), which is the standard workaround for SSE authentication.

3. **EventSource connection leak on error**: The `onerror` handler called `this.connect()` without first closing the existing `EventSource` instance. Since `EventSource` has built-in auto-reconnect behavior, the old instance could remain active in the background while a new one is created, leading to duplicate connections. Fixed by adding `this.eventSource.close()` before the reconnect timeout, and also closing any existing connection at the start of `connect()`.

## Review Notes
- The `{ userId: 1, read: 1 }` index (third index in Step 1) is redundant because the first index `{ userId: 1, read: 1, createdAt: -1 }` already covers queries on `{ userId, read }` as a prefix. This doesn't cause errors but wastes storage and write overhead.
- The `fullDocument: "required"` option on the change stream (Step 3) requires MongoDB 6.0+. For insert operations, the full document is always included in the change event regardless of this setting, so it has no practical effect on the filtered pipeline. This is not incorrect but could be simplified to `"default"` for broader compatibility.
- The post correctly notes that the system is stateful per server instance (user-to-connection mappings). In a multi-server deployment, each server would need its own change stream watcher, which is a valid and scalable pattern since MongoDB supports multiple concurrent change streams.
