# Validation Summary: How to Use Redis for gRPC Service Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (keyspace notifications, key TTL, pub/sub)
- gRPC (custom resolver API via `google.golang.org/grpc/resolver`)
- Go (go-redis/v9 client library)

## Sources Consulted
- go-redis/v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- go-redis/v9 source (string_commands.go, pubsub.go): https://github.com/redis/go-redis
- Redis keyspace notifications documentation: https://redis.io/docs/manual/keyspace-notifications/
- gRPC Go resolver package source (v1.79.2): https://github.com/grpc/grpc-go/blob/master/resolver/resolver.go
- Go language specification (range expressions)

## Issues Found

### 1. `SetEx` is deprecated in go-redis/v9
- **What was wrong:** The `register` function used `rdb.SetEx(ctx, key, serviceAddr, ttl)`. The `SetEx` method is marked deprecated in go-redis/v9 with the note "Use Set with expiration instead as of Redis 2.6.12."
- **What was changed:** Replaced `rdb.SetEx(ctx, key, serviceAddr, ttl)` with `rdb.Set(ctx, key, serviceAddr, ttl)`.
- **Why:** `Set` with an expiration parameter is the current recommended API. Both produce the same Redis command, but `SetEx` may be removed in a future library version.

### 2. Missing `del` keyevent subscription in `watchServiceChanges`
- **What was wrong:** The `watchServiceChanges` function subscribed to `__keyevent@0__:set` and `__keyevent@0__:expired` but not `__keyevent@0__:del`. Since the post includes a `deregister` function that calls `rdb.Del()`, explicit deregistration would not trigger a notification to watching clients.
- **What was changed:** Added `fmt.Sprintf("__keyevent@0__:del")` to the `PSubscribe` call.
- **Why:** Without subscribing to `del` events, clients would not be notified when a service gracefully deregisters. They would only learn about the removal when the key eventually expired (which would never happen since it was already deleted), leaving stale endpoints in the load balancer.

## Review Notes
- The `Keys` command (`rdb.Keys`) scans the entire keyspace and can block Redis on large databases. For production use, `SCAN` would be more appropriate. This is acceptable for a tutorial but worth noting for readers scaling beyond small deployments.
- The `fmt.Sprintf` calls on static strings (e.g., `fmt.Sprintf("__keyevent@0__:set")`) are unnecessary since they contain no format verbs, but this is a stylistic issue and does not affect correctness.
- The custom gRPC resolver snippet shows only `ResolveNow` but the `resolver.Resolver` interface also requires a `Close()` method. This is acceptable for a tutorial showing the key concept, but a complete implementation would need both methods plus a `ResolverBuilder`.
- The Redis config `notify-keyspace-events "KEA"` enables all event types, which is broader than needed. For a minimal setup, `"KEx"` (keyspace + keyevent + expired) would suffice, but `"KEA"` is correct and functional.
