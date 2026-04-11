# Validation Summary: How to Build a Call Queue System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, sets, Pub/Sub, Lua scripting, pipelining)
- Python (redis-py client library)
- cjson (Redis built-in Lua JSON library)

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd
- Redis ZPOPMIN documentation: https://redis.io/commands/zpopmin
- Redis ZRANK documentation: https://redis.io/commands/zrank
- Redis PUBLISH documentation: https://redis.io/commands/publish
- Redis Lua scripting documentation: https://redis.io/docs/interact/programmability/eval-intro/
- redis-py documentation for `register_script`: https://redis-py.readthedocs.io/en/stable/
- redis-py `pipeline()` default behavior (source code verification: `transaction=True` by default)
- Redis cjson library availability in Lua environment

## Issues Found

### 1. Data model used HSET but code uses SET with JSON
**What was wrong:** The data model section showed `HSET call:abc123 caller_id +15551234567 ...` (a Redis hash), but the actual Python code stores call data as a JSON string using `r.set()`. A reader following the data model would attempt `HGETALL` to retrieve call info and get incorrect results.
**What was changed:** Updated the data model to use `SET call:abc12345 '{...}'` with a JSON string, matching the code.

### 2. Data model ZADD score was a raw timestamp instead of composite priority+time score
**What was wrong:** The data model showed `ZADD queue:support 1711900001 "call-abc123"` using a raw Unix timestamp as the score. The actual code computes a composite score as `priority + (entered_at % 100000) / 1000000`, producing values like `1.900001` — not raw timestamps. This would mislead readers about how priority-based ordering works.
**What was changed:** Updated the ZADD example to `ZADD queue:support 1.900001 "abc12345"` with a comment explaining the composite score format.

### 3. Data model included unused assignment hash
**What was wrong:** The data model showed `HSET assignment:agent-42 call_id abc123 started_at 1711900100`, but no code in the post ever creates or reads this hash. It would confuse readers looking for where assignments are stored.
**What was changed:** Removed the unused assignment hash from the data model section.

## Review Notes
- The `call_id = str(uuid.uuid4())[:8]` truncation produces only 8 hex characters, which has a non-trivial collision probability at scale. For a production system, a full UUID or longer identifier would be safer. Acceptable for a tutorial.
- The scoring formula `priority + (entered_at % 100000) / 1000000` wraps the time component every ~27.8 hours. For long-running queues, this could cause newer calls to receive lower scores than older ones within the same priority. A production system should use a monotonic counter or full timestamp with sufficient decimal precision.
- The `complete_call` function performs a non-atomic read-compute-write sequence for the rolling average (lpush, ltrim, lrange, compute, set). Under concurrent call completions, the average could briefly reflect stale data. Acceptable for a tutorial.
- The wait time estimation uses only currently-available (idle) agents, not total agents working the queue. When all agents are busy, it defaults to 1, which can overestimate wait times. A production system might track total active agents separately.
- The `isinstance(call_id, bytes)` check in `agent_ready` is unnecessary when `decode_responses=True` is set, since Lua script return values are automatically decoded. It's harmless but dead code.
