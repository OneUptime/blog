# Validation Summary: How to Use Redis Streams in Go with go-redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Streams
- Go (Golang)
- go-redis v9 (`github.com/redis/go-redis/v9`)

## Sources Consulted
- go-redis v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- go-redis stream commands source code: https://github.com/redis/go-redis/blob/master/stream_commands.go
- go-redis client guide on Redis.io: https://redis.io/docs/latest/develop/clients/go/
- Redis XREADGROUP command documentation: https://redis.io/docs/latest/commands/xreadgroup/
- Redis XINFO GROUPS command documentation: https://redis.io/docs/latest/commands/xinfo-groups/

## Issues Found

### 1. `Block` field uses wrong type (critical)
- **What was wrong:** The `Block` field in `XReadGroupArgs` was set to `2000` (an untyped integer literal). In go-redis v9, `Block` is typed as `time.Duration`, so `2000` is interpreted as 2000 nanoseconds (2 microseconds) — not 2 seconds as the comment claimed. This would cause the blocking read to return almost immediately instead of waiting for new messages.
- **What was changed:** Replaced `Block: 2000` with `Block: 2 * time.Second` and added `"time"` to the import block in the first code example.
- **Why:** `time.Duration` is measured in nanoseconds. The correct way to express 2 seconds is `2 * time.Second`.

## Review Notes
- All other API calls (`XAdd`, `XRange`, `XGroupCreateMkStream`, `XReadGroup`, `XAck`, `XTrimMaxLen`, `XTrimMaxLenApprox`, `XInfoStream`, `XInfoGroups`) use correct signatures for go-redis v9.
- The `redis.Nil` error check for detecting blocking read timeouts is correct.
- The explanation of `"0"` vs `">"` stream IDs for pending message recovery is accurate.
- The BUSYGROUP error string check is a valid pattern for idempotent group creation.
