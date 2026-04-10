# Validation Summary: How to Use TIME in Redis to Get Server Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (TIME command)
- Redis CLI
- Lua scripting in Redis
- Python (redis-py library)

## Sources Consulted
- Redis TIME command documentation: https://redis.io/commands/time/
- Redis EVAL/scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py library documentation: https://redis-py.readthedocs.io/

## Issues Found
No technical issues found.

## Review Notes
- The Lua script example calls `redis.call('TIME')` and only returns a value (no writes). In Redis 7.0+, this works without issue. In pre-7.0 Redis, calling non-deterministic commands like TIME in Lua scripts had replication caveats (scripts could produce different results on replicas). Since the example script is read-only, it avoids the "write after non-deterministic command" error, but authors should be aware of this nuance for more complex scripts that mix TIME with write operations.
- The listed use case "Generating monotonic event IDs inside Lua scripts" is reasonable in practice but slightly imprecise — TIME does not guarantee strict monotonicity if the system clock is adjusted backward (e.g., by NTP). On a well-configured server this is rarely an issue, but it is worth noting for correctness-critical applications.
