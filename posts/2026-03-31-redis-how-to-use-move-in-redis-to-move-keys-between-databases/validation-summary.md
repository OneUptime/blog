# Validation Summary: How to Use MOVE in Redis to Move Keys Between Databases

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (MOVE, SELECT, COPY, RENAME, DUMP/RESTORE commands)
- Python (redis-py client library)
- Redis Cluster

## Sources Consulted
- Redis official MOVE command documentation: https://redis.io/docs/latest/commands/move/
- Redis official COPY command documentation: https://redis.io/docs/latest/commands/copy/
- Redis source code (src/db.c) for MOVE implementation details (cluster mode error, same-db check, TTL preservation)
- Redis official RENAME command documentation: https://redis.io/docs/latest/commands/rename/
- redis-py library documentation for the `move()` method

## Issues Found

1. **Incorrect cluster mode error message**: The post showed the error as `CROSSSLOT Keys in request don't hash to the same slot` when attempting MOVE in cluster mode. The actual error is `(error) ERR MOVE is not allowed in cluster mode`. The CROSSSLOT error is for multi-key commands where keys hash to different slots, not for MOVE. Fixed the error message in the code example.

2. **Incorrect "Same DB operation" value in comparison table**: The MOVE row listed "Possible" for "Same DB operation". Redis explicitly rejects MOVE when the source and destination database are the same, returning `ERR source and destination objects are the same`. Changed to "No".

3. **Contradictory claim about visibility gaps**: The third limitation bullet stated MOVE "can cause brief visibility gaps between the delete from source and insert to destination" while simultaneously noting "the command itself is atomic." These claims contradict each other. Since MOVE is atomic within Redis's single-threaded event loop, there is no visibility gap. Rewrote the bullet to accurately describe the concern (application logic complexity) without the false atomicity contradiction.

## Review Notes
- The Python code examples correctly use `redis.Redis` with separate connection objects per database, which is the proper pattern for redis-py when working with multiple databases.
- The `safe_move` function (checking existence before moving) has an inherent race condition between the EXISTS checks and the MOVE call, but MOVE itself is safe against this since it will return 0 if conditions aren't met. This is acceptable for the tutorial context.
- The COPY command was correctly noted as available since Redis 6.2+.
- The default 16 databases (0-15) claim is correct and matches the default `databases 16` setting in redis.conf.
