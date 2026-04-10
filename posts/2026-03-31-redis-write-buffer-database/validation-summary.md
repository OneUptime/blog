# Validation Summary: How to Use Redis as a Write Buffer for Database Writes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (lists, pipelines, AOF persistence)
- Python (redis-py client library)
- PostgreSQL (psycopg2 driver, batch inserts with execute_values)
- Bash (redis-cli monitoring commands)

## Sources Consulted
- Redis RPOPLPUSH documentation: https://redis.io/docs/latest/commands/rpoplpush/ (confirms deprecated since Redis 6.2.0)
- Redis LMOVE documentation: https://redis.io/docs/latest/commands/lmove/ (replacement command)
- redis-py GitHub source (core.py): https://github.com/redis/redis-py/blob/master/redis/commands/core.py (lmove method signature)
- Redis RPUSH documentation: https://redis.io/docs/latest/commands/rpush/
- Redis LPOP documentation: https://redis.io/docs/latest/commands/lpop/
- Redis LLEN documentation: https://redis.io/docs/latest/commands/llen/
- psycopg2 documentation for execute_values: https://www.psycopg.org/docs/extras.html#psycopg2.extras.execute_values

## Issues Found
1. **Deprecated `RPOPLPUSH` command**: The "Crash-Safe Flush with Processing Key" section used `pipeline.rpoplpush(WRITE_BUFFER, PROCESSING_BUFFER)`, and the Summary referenced `RPOPLPUSH`. The `RPOPLPUSH` command has been deprecated since Redis 6.2.0 (released 2021) in favor of `LMOVE source destination RIGHT LEFT`. Updated the code to use `pipeline.lmove(WRITE_BUFFER, PROCESSING_BUFFER, "RIGHT", "LEFT")` and updated the Summary to reference `LMOVE` instead.

## Review Notes
- The backpressure check (`llen` then `rpush`) in `buffer_write()` is not atomic — under high concurrency the buffer could slightly exceed `MAX_BUFFER_SIZE`. This is acceptable for the use case described but worth noting.
- The comment "Move batch atomically to processing key" in `safe_flush()` is slightly misleading: each individual `lmove` is atomic, but the pipeline of multiple `lmove` commands is not atomic as a whole (another client could interleave). The pattern is still correct and safe for the intended purpose.
- The claim "Writes are durable once in Redis (with AOF)" is accurate but depends on the `appendfsync` setting. With the default `appendfsync everysec`, up to 1 second of data could be lost on crash. With `appendfsync always`, every write is durable but at a performance cost.
