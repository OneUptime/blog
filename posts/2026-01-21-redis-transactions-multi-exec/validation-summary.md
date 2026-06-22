# Validation Summary: How to Use Redis Transactions with MULTI/EXEC

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Redis transactions
- MULTI, EXEC, DISCARD, WATCH, UNWATCH
- Redis optimistic locking
- redis-py
- ioredis
- go-redis
- Lua scripting in Redis
- Python
- Node.js
- Go

## Sources Consulted
- Redis transactions documentation: https://redis.io/docs/latest/develop/using-commands/transactions/
- Redis redis-py pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- redis-py advanced features documentation: https://redis.readthedocs.io/en/stable/advanced_features.html
- ioredis transaction documentation: https://github.com/redis/ioredis#transaction
- Redis go-redis pipelines and transactions documentation: https://redis.io/docs/latest/develop/clients/go/transpipe/

## Issues Found
- The redis-py WATCH examples used `r.watch(...)` / `r.unwatch(...)` on the Redis client and then created a separate pipeline for the transaction. In redis-py, WATCH-based transactions must use the same pipeline/connection for `watch`, reads, `multi`, queued writes, and `execute`. Updated the Python WATCH examples to use `with r.pipeline() as pipe`, `pipe.watch(...)`, `pipe.get(...)`, `pipe.multi()`, and `pipe.execute()`.
- The Python WATCH pattern stated that `execute()` returns `None` if a watched key changes. redis-py raises `redis.WatchError` for that case. Updated the comment to match redis-py behavior.
- The ioredis WATCH example retried on `EXECABORT`, but ioredis returns `null` when WATCH aborts the transaction. `EXECABORT` indicates a transaction discarded because of earlier command errors, not a WATCH conflict. Removed the misleading retry branch.
- Some Python snippets used `time.time()` without importing `time` in the snippet. Added `import time` to the relevant examples.
- One transaction selection comment said related operations "must succeed together." Redis transactions do not roll back execution-time command errors; other queued commands still execute. Reworded it to "must execute without interleaving."

## Review Notes
The core Redis transaction explanations are accurate: MULTI queues commands, EXEC runs them sequentially without interleaving from other clients, WATCH provides optimistic locking, and execution-time command errors do not roll back the rest of the transaction. The example balance transfers remain intentionally simple and do not include insufficient-funds checks; the post later covers WATCH and Lua for conditional read-modify-write logic.
