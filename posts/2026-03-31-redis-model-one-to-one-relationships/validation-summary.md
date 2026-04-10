# Validation Summary: How to Model One-to-One Relationships in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (HSET, HGET, HGETALL, SET, GET, MEMORY USAGE, MULTI/EXEC, EXPIRE)
- Python (redis-py client library)
- Bash / redis-cli

## Sources Consulted
- Redis HSET documentation: https://redis.io/docs/latest/commands/hset/ — confirmed multi-field HSET support (Redis 4.0+)
- Redis MULTI/EXEC documentation: https://redis.io/docs/latest/commands/multi/ — verified atomic execution guarantees and behavior on server crash
- Redis MEMORY USAGE documentation: https://redis.io/docs/latest/commands/memory-usage/ — confirmed availability since Redis 4.0
- redis-py Pipeline documentation: https://redis-py.readthedocs.io/en/stable/advanced_features.html — verified pipeline transaction mode and `pipe.multi()` behavior
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/ — verified AOF fsync behavior during crash recovery

## Issues Found

### 1. Incorrect claim about MULTI/EXEC partial writes (line 156)
- **What was wrong:** The paragraph after the "Atomic Writes" code example stated: "If the pipeline is interrupted mid-way (power loss), only one side may be written." This contradicts the MULTI/EXEC guarantee. MULTI/EXEC ensures atomic execution — either all commands in the transaction execute or none do. If the server crashes mid-transaction, Redis's AOF recovery removes the partial transaction, preventing one-sided writes.
- **What was changed:** Replaced with an accurate explanation: MULTI/EXEC ensures atomicity (no client sees partial state), but the entire transaction could be lost on crash depending on AOF fsync policy.
- **Why:** The original text would mislead readers into thinking MULTI/EXEC doesn't prevent partial writes, which undermines the purpose of the section.

### 2. Python dict print output format (line 106)
- **What was wrong:** The comment showed expected output as `{"name": "Alice", "email": "alice@example.com"}` with double quotes, but Python's `print()` of a dict uses single quotes in its repr.
- **What was changed:** Changed to `{'name': 'Alice', 'email': 'alice@example.com'}`.
- **Why:** Minor accuracy fix to match actual Python output.

## Review Notes
- The `pipe.multi()` call in the `atomic_link` function is technically redundant since `r.pipeline()` defaults to `transaction=True`, which already wraps commands in MULTI/EXEC. However, it does make the intent explicit and doesn't cause errors, so it was left as-is.
- All Redis commands use syntax available since Redis 4.0+ (multi-field HSET, MEMORY USAGE), which is appropriate for a modern audience.
- The redis-py code correctly uses `decode_responses=True`, `mapping=` parameter for HSET, and `ex=` parameter for TTL, all of which are current API.
