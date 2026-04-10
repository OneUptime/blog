# Validation Summary: How to Use Redis Sentinel with go-redis in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go (Golang)
- Redis Sentinel
- go-redis v9 (`github.com/redis/go-redis/v9`)

## Sources Consulted
- go-redis v9 source code (`github.com/redis/go-redis/v9`), specifically `sentinel.go` and `osscluster.go`
- go-redis `FailoverOptions` struct definition and field documentation
- go-redis `NewFailoverClient`, `NewFailoverClusterClient`, and `NewSentinelClient` function signatures and implementations
- go-redis panic guard in `NewFailoverClient` for `RouteByLatency` / `RouteRandomly` usage

## Issues Found

1. **`SlaveOnly` renamed to `ReplicaOnly` in v9** (line 73): The `FailoverOptions` field `SlaveOnly` was renamed to `ReplicaOnly` in go-redis v9. The old name does not exist in the current codebase and would cause a compile error. Changed `SlaveOnly` to `ReplicaOnly`.

2. **`RouteByLatency` panics with `NewFailoverClient`** (lines 70-76): The blog used `redis.NewFailoverClient` with `RouteByLatency: true`. In go-redis v9, `NewFailoverClient` explicitly panics if `RouteByLatency` is set: `"to route commands by latency, use NewFailoverClusterClient"`. Changed the code example to use `redis.NewFailoverClusterClient`.

3. **`RouteByLatency` description was misleading** (line 78, line 154): The post stated that `RouteByLatency` "selects the lowest-latency available replica." In reality, it selects the lowest-latency node among both the master and replicas for read-only commands. Updated the explanation and the summary paragraph to reflect this.

## Review Notes
- The `RouteByLatency` option automatically enables `ReadOnly` internally (in the cluster client), so setting `ReplicaOnly` is not strictly necessary when `RouteByLatency` is true. The example now correctly shows `ReplicaOnly: false` which is fine since `RouteByLatency` handles it.
- `NewFailoverClusterClient` returns `*ClusterClient`, not `*redis.Client`. The "Routing Reads to Replicas" example does not specify a type for `rdb` (uses `:=`), so this is not a bug, but readers should be aware that this client type differs from the one created by `NewFailoverClient`.
- All other code examples (`NewFailoverClient`, `NewSentinelClient`, `GetMasterAddrByName`, connection monitoring, retry wrapper) are correct and compile-ready for go-redis v9.
- The import path `github.com/redis/go-redis/v9` is the current correct path.
