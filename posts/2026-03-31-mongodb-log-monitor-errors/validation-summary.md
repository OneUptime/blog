# Validation Summary: How to Log and Monitor MongoDB Errors in Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Node.js Driver (connection pool events, command monitoring)
- Winston (structured logging)
- prom-client (Prometheus metrics for Node.js)
- Prometheus (metrics scraping)
- OneUptime (alerting)

## Sources Consulted
- MongoDB Node.js Driver API documentation — command monitoring events (`CommandSucceededEvent`, `CommandFailedEvent`, `CommandStartedEvent`)
- MongoDB Node.js Driver CMAP specification — connection pool event names
- MongoDB server error codes source (`src/mongo/base/error_codes.yml`)
- prom-client npm package documentation — `Histogram.startTimer()`, `Counter.inc()` APIs
- Winston npm package documentation — `createLogger`, transports, format combiners

## Issues Found

1. **Wrong command monitoring event names (lines 157, 168):** The post used `client.on('succeeded', ...)` and `client.on('failed', ...)`. The correct MongoDB driver event names are `'commandSucceeded'` and `'commandFailed'`. Using the incorrect names would silently register listeners that never fire. Fixed both event names.

2. **`e.command` not available on `CommandSucceededEvent` (line 163):** The post accessed `e.command[e.commandName]` to get the collection name from a `commandSucceeded` event. The `command` property (containing the original command document) is only available on `CommandStartedEvent`, not `CommandSucceededEvent`. Accessing it would return `undefined`. Removed the `collection` field from the slow command log entry since the collection name is not directly available on this event.

## Review Notes
- The MongoDB error codes (6, 7, 89, 91, 189, 216, 10107 as transient; 13, 18 as auth) are all correctly mapped. Code 216 (ElectionInProgress) is not officially tagged as `RetriableError` by MongoDB unlike the other transient codes, but treating it as transient is reasonable in practice.
- The prom-client usage pattern (partial labels to `startTimer()`, remaining labels on the timer callback) is correct and idiomatic.
- The Winston logger configuration is correct and follows best practices.
- The `CommandSucceededEvent.duration` property name is correct for the MongoDB Node.js driver v6.x.
