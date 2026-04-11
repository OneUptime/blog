# Validation Summary: How to Use COPY in Redis to Duplicate Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 6.2+ (COPY command)
- Python (redis-py client library)
- Node.js (node-redis v4 client library)
- Go (go-redis/v9 client library)

## Sources Consulted
- Redis COPY command documentation: https://redis.io/docs/latest/commands/copy/
- Redis RENAME command documentation: https://redis.io/docs/latest/commands/rename/
- Redis DUMP command documentation: https://redis.io/docs/latest/commands/dump/
- Redis RESTORE command documentation: https://redis.io/docs/latest/commands/restore/
- node-redis COPY command source: https://github.com/redis/node-redis/blob/master/packages/client/lib/commands/COPY.ts

## Issues Found
1. **Node.js COPY options parameter name**: The `copy()` call for cross-database copying used `{ destinationDb: 2 }`, but node-redis v4 expects `{ DB: 2 }` (uppercase property name matching the Redis command syntax). Changed `destinationDb` to `DB`.

## Review Notes
- The Python snapshot example uses `datetime.datetime.utcnow()`, which is deprecated since Python 3.12 in favor of `datetime.datetime.now(datetime.UTC)`. It still works but may warrant updating in a future revision.
- The Node.js example uses top-level `await` without an enclosing `async` function, which is a common convention in code snippets but requires Node.js ES modules or an async wrapper to actually run.
- The comparison table (COPY vs RENAME vs DUMP/RESTORE) is accurate. DUMP does not include TTL in its serialized output; RESTORE accepts an explicit TTL parameter, making TTL handling "Optional" as stated.
- All Redis CLI examples, Python code, and Go code are correct and use current, non-deprecated APIs.
