# Validation Summary: How to Use Connection Pooling with the MongoDB Go Driver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Go (Golang)
- MongoDB Go Driver v2 (`go.mongodb.org/mongo-driver/v2`)
- Connection pooling / CMAP events

## Sources Consulted
- MongoDB Go Driver v2 source code and API reference on pkg.go.dev (`go.mongodb.org/mongo-driver/v2/mongo`, `go.mongodb.org/mongo-driver/v2/mongo/options`, `go.mongodb.org/mongo-driver/v2/event`)
- MongoDB Go Driver GitHub repository (`mongodb/mongo-go-driver`)
- MongoDB official documentation on connection pool configuration

## Issues Found

1. **`SetSocketTimeout` does not exist in v2.** The `SetSocketTimeout` method was available in the v1 driver but was removed in v2. The blog post called `SetSocketTimeout(60 * time.Second)` in the configuration example. Removed this line, as v2 does not have a direct socket timeout option on `ClientOptions`. Per-operation timeouts should be set via `context.WithTimeout`, which is already covered later in the post.

2. **Incorrect CMAP event constant names.** All four event constant names in the pool monitoring example were wrong. Fixed:
   - `event.GetStarted` -> `event.ConnectionCheckOutStarted`
   - `event.GetSucceeded` -> `event.ConnectionCheckedOut`
   - `event.ConnectionReturned` -> `event.ConnectionCheckedIn`
   - `event.PoolClosedEvent` -> `event.ConnectionPoolClosed`

## Review Notes
- The `mongo.Connect(opts)` signature (no context parameter) is correct for v2. In v1 it required a context as the first argument.
- Default pool values (MaxPoolSize: 100, MinPoolSize: 0, MaxConnecting: 2, MaxConnIdleTime: 0, ConnectTimeout: 30s, ServerSelectionTimeout: 30s) are all confirmed correct against the v2 source code.
- The singleton pattern using `sync.Once` is a sound and idiomatic approach for Go HTTP servers.
- The pool sizing formula is a reasonable rule of thumb, though in practice connection reuse means the actual needed pool size is often lower than `goroutines * db_calls_per_goroutine`.
