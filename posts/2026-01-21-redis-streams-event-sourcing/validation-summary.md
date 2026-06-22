# Validation Summary: How to Use Redis Streams for Event Sourcing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Streams
- Redis stream commands: XADD, XREAD, XRANGE, XREVRANGE, XGROUP, XREADGROUP, XACK, XPENDING, XCLAIM, XAUTOCLAIM, XTRIM, XINFO
- Redis consumer groups and pending entry lists
- Python with redis-py
- Node.js with ioredis
- Go with go-redis/v9

## Sources Consulted
- Redis XADD command documentation: https://redis.io/docs/latest/commands/xadd/
- Redis XREADGROUP command documentation: https://redis.io/docs/latest/commands/xreadgroup/
- Redis XGROUP CREATE command documentation: https://redis.io/docs/latest/commands/xgroup-create/
- Redis XPENDING command documentation: https://redis.io/docs/latest/commands/xpending/
- Redis XAUTOCLAIM command documentation: https://redis.io/docs/latest/commands/xautoclaim/
- Redis Streams data type documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis streaming with go-redis official guide: https://redis.io/docs/latest/develop/use-cases/streaming/go/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- go-redis/v9 package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- ioredis project documentation: https://github.com/redis/ioredis

## Issues Found
- The description claimed "exactly-once processing." Redis Streams consumer groups provide at-least-once processing unless the application adds its own idempotency/deduplication. Changed this to "at-least-once processing."
- The introduction referred generally to "delivery guarantees," which could imply stronger semantics than Redis Streams provides. Reworded it to focus on acknowledgments and pending-message recovery.
- The special ID `0` was described as the beginning of the stream for `XREADGROUP`. For `XREADGROUP`, an explicit ID such as `0` reads pending entries for the current consumer, not new stream entries from the beginning. Updated the wording accordingly.
- The Python example used `datetime.utcnow()`, which is deprecated in current Python versions. Replaced it with `datetime.now(timezone.utc).isoformat()`.
- The Go example checked for an exact BUSYGROUP error string. Made the check use `strings.Contains(err.Error(), "BUSYGROUP")` so the example is not dependent on an exact server/client error message.

## Review Notes
- The Redis command examples match the current official command syntax for XADD, XREAD, XREADGROUP, XGROUP CREATE, XPENDING, XAUTOCLAIM, and XTRIM.
- Python and JavaScript code fences were parsed locally for syntax. The environment did not have `go` or `gofmt` installed, so the Go sample was reviewed against official go-redis examples and checked structurally rather than compiled locally.
- For production event sourcing, the examples are intentionally simple. A production implementation should add aggregate version checks, stronger idempotency, explicit retention policy decisions, and dead-letter handling for repeatedly failing messages.
