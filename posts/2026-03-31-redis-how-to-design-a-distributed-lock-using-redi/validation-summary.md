# Validation Summary: How to Design a Distributed Lock Using Redis in a System Design Interview

## Status
validated

## Post Type
Tutorial / System Design Interview Guide

## Technologies Covered
- Redis (SET NX EX, EXPIRE, Lua scripting, EVAL)
- Node.js with ioredis and uuid packages
- Python with redis-py
- Redlock algorithm (multi-node distributed locking)

## Sources Consulted
- Redis SET command documentation: https://redis.io/commands/set (NX, EX, PX flags)
- Redis EXPIRE command documentation: https://redis.io/commands/expire (sets absolute TTL, does not add to existing TTL)
- Redis EVAL command documentation: https://redis.io/commands/eval (Lua scripting, KEYS/ARGV conventions)
- Redis official Redlock algorithm description: https://redis.io/docs/manual/patterns/distributed-locks/
- ioredis API documentation: https://github.com/redis/ioredis
- redis-py API documentation: https://redis-py.readthedocs.io/
- Martin Kleppmann's analysis of Redlock: https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html

## Issues Found
1. **Misleading parameter name in `extend` method** (Node.js implementation): The parameter was named `additionalSeconds`, implying it adds time to the remaining TTL. However, the Redis `EXPIRE` command sets an absolute TTL, completely replacing the remaining time. Calling `extend(10)` on a lock with 20 seconds remaining would reduce the TTL to 10 seconds, not increase it to 30. Renamed the parameter to `ttlSeconds` to accurately reflect that it sets a new TTL value.

## Review Notes
- The bash example in "Basic Redis Lock with SET NX EX" intentionally shows the non-atomic GET + DEL release pattern. The post later correctly explains (in the Lua script implementation and the Interview Discussion Points) why this is unsafe and why Lua scripts should be used instead. This pedagogical progression is appropriate.
- The Redlock implementation acquires locks sequentially across nodes. The official algorithm recommends adding random jitter to retry delays to avoid thundering herd scenarios. The fixed retry delay used here is a reasonable simplification for an educational blog post.
- The Redlock mutual exclusion guarantee is listed as "Yes" in the safety table. This is the claim of the Redlock paper, but it is contested by Kleppmann's analysis. The post appropriately notes this debate in the "Known limitation" note below the table.
- All Lua scripts correctly use the atomic check-owner-then-act pattern, which is the recommended approach from Redis documentation.
