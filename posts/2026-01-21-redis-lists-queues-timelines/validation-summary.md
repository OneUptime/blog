# Validation Summary: How to Use Redis Lists for Queues and Timelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Lists
- Redis list commands: LPUSH, RPUSH, LPOP, RPOP, BLPOP, BRPOP, LMOVE, BLMOVE, LREM, LTRIM
- Python with redis-py
- Node.js with ioredis
- Go with go-redis/v9

## Sources Consulted
- Redis Lists documentation: https://redis.io/docs/latest/develop/data-types/lists/
- Redis BLMOVE command documentation: https://redis.io/docs/latest/commands/blmove/
- Redis LMOVE command documentation: https://redis.io/docs/latest/commands/lmove/
- Redis BLPOP command documentation: https://redis.io/docs/latest/commands/blpop/
- Redis RPOPLPUSH command documentation: https://redis.io/docs/latest/commands/rpoplpush/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- Redis Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- ioredis API documentation: https://redis.github.io/ioredis/classes/Redis.html
- Redis Go client guide: https://redis.io/docs/latest/develop/clients/go/
- go-redis/v9 package reference: https://pkg.go.dev/github.com/redis/go-redis/v9

## Issues Found
- The reliable queue shell example used `LMOVE processing jobs RIGHT LEFT` for a failed job. That can move whichever item is at the selected end of the processing list, not necessarily the exact failed job in concurrent processing scenarios. Changed it to a `MULTI` / `LREM` / `LPUSH` / `EXEC` sequence so the example removes the exact failed payload and requeues it atomically.
- The Python `dequeue_reliable` docstring promised a "reliable processing guarantee." A processing-list pattern improves reliability but does not by itself recover jobs after consumer crashes unless stale processing items are monitored. Changed the docstring to describe the actual operation.
- The Python section labeled a list-backed message queue as using "Consumer Groups." Redis Consumer Groups are a Streams feature, not a Lists feature. Renamed the section to "Simple Message Queue" and removed the unused `consumers_key` field.
- The Go snippet imported `log` without using it. Go rejects unused imports at compile time, so the import was removed.
- The best-practice and conclusion wording around reliable queues was tightened to refer to processing-list queue workflows and stale-item recovery instead of implying that `LMOVE` alone provides complete reliability.

## Review Notes
- Python syntax was checked locally with `compile`.
- JavaScript syntax was checked locally with Node's `vm.Script` parser.
- Go could not be compiled locally because the `go` toolchain is not installed in this workspace; the snippet was reviewed statically against the official go-redis/v9 documentation.
- Redis Lists can implement queue-like patterns, but applications that need stronger delivery guarantees, acknowledgements, pending-entry tracking, or consumer groups should evaluate Redis Streams.
