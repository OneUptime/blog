# Validation Summary: How to Build a CAPTCHA Challenge Store with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key-value store, hashes, TTL, INCR)
- Python 3
- redis-py (Python Redis client)
- hashlib (SHA-256 hashing)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found
- **Data model inconsistency**: The data model section listed the hash fields as `answer, ip, created_at`, but the code actually stores `answer_hash, ip, created_at` (the answer is hashed before storage). Fixed the data model to say `answer_hash` to match the code.

## Review Notes
- The INCR + conditional EXPIRE rate-limiting pattern has a theoretical race condition: if the process crashes between INCR (which creates the key) and EXPIRE (when `issued == 1`), the key could persist indefinitely. A Lua script or `SET NX EX` approach would be more robust, but this is a common and acceptable pattern for a tutorial.
- Hashing simple math answers (range 2-40) with SHA-256 provides minimal security since the answer space is trivially brute-forceable. The blog acknowledges this with its comment about sensitivity, which is appropriate.
- The validate-then-delete flow has a minor TOCTOU (time-of-check-time-of-use) window where concurrent requests could both read the challenge before either deletes it. A Lua script wrapping the check-and-delete would be atomic, but this is acceptable for tutorial purposes.
- All redis-py API calls (`hset` with `mapping`, `incr`, `expire`, `hgetall`, `get`, `set` with `ex`, `delete`) are current and non-deprecated.
- All Redis CLI commands in the example usage section use correct syntax.
