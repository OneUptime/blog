# Validation Summary: How to Use OBJECT IDLETIME in Redis to Check Key Idle Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (OBJECT IDLETIME command)
- Redis eviction policies (LRU, LFU)
- Redis CLI
- Python redis-py client library
- Bash scripting (SCAN + OBJECT IDLETIME pipeline)

## Sources Consulted
- Redis official documentation for OBJECT IDLETIME: https://redis.io/docs/latest/commands/object-idletime/
- Redis official documentation for OBJECT command: https://redis.io/commands/object/
- Redis source code (`object.c`) for LFU policy error check logic
- redis-py (Python Redis client) documentation for `object_idletime()` method
- Redis GitHub issue #4403 regarding SET and idle time behavior with shared integer objects

## Issues Found

### 1. Incorrect claim about LRU-only availability (Limitations with LFU Policy section)
- **What was wrong:** The blog stated `OBJECT IDLETIME` "only works when the `maxmemory-policy` is set to an LRU-based policy." This is incorrect. The command works with any non-LFU policy, including `noeviction` (the default), `allkeys-random`, `volatile-random`, and `volatile-ttl`. The error message shown in the blog itself ("...is not set to an LFU policy") actually contradicted this claim.
- **What was changed:** Rewrote the sentence to: "OBJECT IDLETIME is not available when the `maxmemory-policy` is set to an LFU-based policy."
- **Why:** The Redis source code checks only for the LFU flag — any non-LFU policy allows the command. The original wording would mislead readers into thinking the command requires an explicit LRU policy setting.

### 2. Incorrect summary statement about LRU-only availability (Summary section)
- **What was wrong:** The summary stated "Remember it only works with LRU policies."
- **What was changed:** Changed to: "Remember it is not available with LFU policies."
- **Why:** Same reason as above — consistency with the actual Redis behavior and the correction made in the body.

## Review Notes
- The `sleep 5` example showing `(integer) 5` is reasonable for modern Redis (2.6+), which uses a 1-second LRU clock resolution (`LRU_CLOCK_RESOLUTION = 1000ms`). In older Redis versions (< 2.6), the resolution was 10 seconds, which would make this example inaccurate. The blog does not specify a Redis version, but this is acceptable for a general tutorial targeting current Redis.
- The Python `r.object_idletime(key)` method is correct for modern redis-py (4.x+). Older versions used `r.object('idletime', key)`.
- There is a known edge case (Redis GitHub issue #4403) where SET on small integers (0-9999) may not properly reset idle time due to Redis's shared integer object optimization. This is a subtle edge case that does not need to be covered in an introductory tutorial.
- `OBJECT IDLETIME` itself does not update the key's LRU clock (it is read-only by design). The blog correctly does not claim otherwise.
