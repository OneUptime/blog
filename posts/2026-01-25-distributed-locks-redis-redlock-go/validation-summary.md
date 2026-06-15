# Validation Summary: How to Implement Distributed Locks with Redis Redlock in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Redis
- go-redis v9
- Redis Redlock distributed locking
- Lua scripts for Redis lock release and extension
- Fencing tokens

## Sources Consulted
- Redis distributed locks and Redlock documentation: https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/
- Redis go-redis guide: https://redis.io/docs/latest/develop/clients/go/
- go-redis official repository: https://github.com/redis/go-redis

## Issues Found
- The dependency installation command used the old `github.com/go-redis/redis/v9` module path while the code imports `github.com/redis/go-redis/v9`. Updated the command to `go get github.com/redis/go-redis/v9`, matching the current official go-redis documentation.
- The Redlock algorithm description said to acquire locks sequentially. Redis' current Redlock documentation describes acquiring locks in parallel with a per-instance timeout that is small relative to the lock TTL. Updated the explanation and sample implementation accordingly.
- The sample implementation did not bound each Redis instance acquisition attempt, which can cause an unavailable Redis node to block lock acquisition longer than intended. Added an `instanceTimeout` field and used `context.WithTimeout` around each `SetNX` call.
- The implementation used a fixed retry delay, while Redis recommends random delay on retry to desynchronize competing clients. Added a small random jitter to retry delay.
- The implementation comment said at least 3 Redis instances for production, while the post summary and Redis examples recommend 5 independent Redis masters. Updated the comment to at least 5.
- The lock extension method did not account for elapsed time and clock drift when updating local lock validity. Updated `Extend` to calculate remaining validity similarly to acquisition.
- The auto-extension snippet claimed extending halfway through the TTL ensures the lock is never lost. That overstates Redlock's guarantees because pauses, failed extensions, and clock behavior can still cause lock loss. Reworded the comment.
- The auto-extension usage example passed `redlock` as a variable even though the earlier manager variable is `rl`. Updated the example to pass `rl`.
- The fencing token SQL helper used `resourceID` without accepting it as a parameter. Added `resourceID string` to the function signature.
- The concurrency test skipped failed acquisition attempts but still expected every worker iteration to increment the counter, which could fail under contention even when locking works. Updated the test snippet to retry acquisition before entering the critical section.

## Review Notes
The Go toolchain was not installed in this environment, so code examples were reviewed statically rather than compiled locally. Redlock remains debated for strong correctness guarantees; the post correctly notes that fencing tokens or consensus systems such as etcd or ZooKeeper should be considered for correctness-critical workflows.
