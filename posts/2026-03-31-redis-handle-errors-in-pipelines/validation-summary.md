# Validation Summary: How to Handle Errors in Redis Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (pipelines, MULTI/EXEC transactions)
- Python (redis-py)
- Go (go-redis)
- Node.js (ioredis)
- Java (Jedis)

## Sources Consulted
- Redis official documentation on transactions: https://redis.io/docs/latest/develop/using-commands/transactions/
- redis-py error handling documentation: https://redis.io/docs/latest/develop/clients/redis-py/error-handling/
- redis-py source (client.py) for `execute(raise_on_error)` signature: https://github.com/redis/redis-py
- go-redis pipeline source and package docs: https://pkg.go.dev/github.com/redis/go-redis/v9
- ioredis documentation on pipelining: https://github.com/redis/ioredis
- Jedis Pipeline source: https://github.com/redis/jedis

## Issues Found

### 1. Misleading comparison to Redis transactions
- **What was wrong:** The introduction stated that per-command error handling in pipelines "is a key difference from transactions." This is incorrect — Redis MULTI/EXEC transactions also do NOT roll back on runtime command errors (e.g., WRONGTYPE). All commands still execute and return per-command results, just like in a plain pipeline. The actual difference is that syntax/arity errors detected during the MULTI queuing phase will cause the entire transaction to be discarded, while pipelines have no queuing phase.
- **What was changed:** Replaced the misleading sentence with an accurate explanation that Redis transactions behave the same way for runtime errors, and clarified that the real difference is queuing-phase syntax errors causing transaction discard.
- **Why:** Readers familiar with Redis transactions could be confused, and readers unfamiliar with them would form an incorrect mental model.

### 2. Inconsistent return types in `safe_pipeline_execute`
- **What was wrong:** On connection error, `failures` was returned as `list[int]` (`list(range(len(commands)))`), but on per-command errors, `failures` was returned as `list[tuple[int, Exception]]` (`failures.append((i, result))`). This inconsistency would cause callers to break when handling the connection error case.
- **What was changed:** Changed the connection error return from `list(range(len(commands)))` to `[(i, e) for i in range(len(commands))]` so both code paths return `list[tuple[int, Exception]]`.
- **Why:** Callers iterating over failures and unpacking `(index, error)` tuples would get a `TypeError` on the connection error path.

## Review Notes
- All four client library code examples (redis-py, go-redis, ioredis, Jedis) were verified against official documentation and source code. API signatures, return types, and error class names are all correct and current.
- The `raise_on_error=True` default for redis-py's `pipe.execute()` is correctly documented.
- The ioredis `pipeline.exec()` return format `[[error, result], ...]` is correctly represented.
- The Jedis `JedisDataException` check for pipeline error detection is correct.
- The go-redis pattern of checking `cmd.Err()` after `pipe.Exec()` is correct.
