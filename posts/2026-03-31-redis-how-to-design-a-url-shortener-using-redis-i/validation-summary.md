# Validation Summary: How to Design a URL Shortener Using Redis in a System Design Interview

## Status
validated

## Post Type
Tutorial / System Design Walkthrough

## Technologies Covered
- Redis (caching, atomic counters, key expiration, SCAN)
- Python (redis-py client library)
- JavaScript/Node.js (ioredis/node-redis for rate limiting example)
- MySQL/PostgreSQL (primary data store)
- Base62 encoding
- MD5 hashing with Base64 encoding

## Sources Consulted
- Redis INCR command documentation: https://redis.io/commands/incr
- Redis SETEX command documentation: https://redis.io/commands/setex
- Redis GETDEL command documentation: https://redis.io/commands/getdel (available since Redis 6.2.0)
- Redis SCAN command documentation: https://redis.io/commands/scan
- Python `hashlib` module documentation: https://docs.python.org/3/library/hashlib.html
- Python `hash()` built-in documentation: https://docs.python.org/3/reference/datamodel.html#object.__hash__ (hash randomization since Python 3.3)
- Python `redis-py` client documentation: https://redis-py.readthedocs.io/
- Python `string` module documentation: https://docs.python.org/3/library/string.html
- Python `base64` module documentation: https://docs.python.org/3/library/base64.html

## Issues Found

1. **Non-deterministic `hash()` used for URL deduplication (line 127)**
   - **What was wrong:** The `shorten_url` function used Python's built-in `hash(long_url)` to construct the Redis deduplication key. Since Python 3.3, `hash()` uses randomized seeding (PYTHONHASHSEED), meaning different API server processes or restarts produce different hash values for the same URL. This would completely break cross-process deduplication.
   - **What was changed:** Replaced `hash(long_url)` with `hashlib.md5(long_url.encode()).hexdigest()`, which produces a deterministic, consistent hash across all processes and restarts.
   - **Why:** A URL shortener runs on multiple API servers behind a load balancer. Deduplication keys must be consistent across all instances.

2. **Unused `import json` (line 106)**
   - **What was wrong:** The `json` module was imported but never used in the Redis Caching Layer code block.
   - **What was changed:** Replaced `import json` with `import hashlib`, which is now needed for the deduplication fix above.
   - **Why:** Unused imports are misleading in tutorial code. The `hashlib` import is actually needed by the corrected deduplication logic.

3. **Inconsistent TTL in Redis data model table**
   - **What was wrong:** The Redis key pattern table listed `url:user:{userId}:count` with TTL "None (per-user limit)", but the rate limiting code explicitly sets a 3600-second (1 hour) expiry on this key.
   - **What was changed:** Updated the table to show "1 hour (per-user limit)" for this key's TTL.
   - **Why:** The data model documentation should accurately reflect the actual behavior shown in the code examples.

## Review Notes
- The `GETDEL` command used in the click count flusher requires Redis 6.2.0+. This is not noted in the post but is worth mentioning if targeting older Redis versions.
- The rate limiting pattern (`INCR` then `EXPIRE`) has a minor race condition: if the process crashes between the two calls, the key could persist without an expiry. In production, a Lua script or `SET key value EX 3600 NX` pattern would be safer. However, this is an acceptable simplification for a system design interview context.
- The `str | None` union type syntax requires Python 3.10+. Earlier versions would need `Optional[str]` from `typing`.
- The SQL schema uses MySQL's `AUTO_INCREMENT` syntax. The architecture mentions "MySQL/PostgreSQL" but the SQL is MySQL-specific. PostgreSQL would use `BIGSERIAL` or `GENERATED ALWAYS AS IDENTITY`. This is acceptable since MySQL is listed as an option.
- The base62 encoding, capacity math (62^6 = ~56 billion), and Redis API usage are all correct.
