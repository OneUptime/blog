# Validation Summary: How to Build an API Key Management System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (data structures: Hash, Set, String; commands: HSET, HGETALL, SADD, SMEMBERS, INCR, EXPIRE, TTL, GET)
- Python 3 (secrets, hashlib, time modules)
- redis-py (Python Redis client)

## Sources Consulted
- Redis official documentation for HSET, HGETALL, INCR, EXPIRE, TTL, SADD, SMEMBERS commands — https://redis.io/docs/latest/commands/
- redis-py documentation for pipeline, hset (mapping parameter), decode_responses — https://redis-py.readthedocs.io/en/stable/
- Python standard library docs for `secrets.token_urlsafe`, `hashlib.sha256`, `time.strftime`, `time.gmtime` — https://docs.python.org/3/library/

## Issues Found

1. **Key rotation grace period was non-functional (logic bug):** `rotate_api_key` set `active` to `"0"` before setting an EXPIRE TTL. Since `authenticate_api_key` checks `active != "1"` and rejects immediately, the 1-hour grace period for in-flight requests was useless — the old key failed auth instantly. Fixed by removing the `active = "0"` write and relying solely on the EXPIRE to remove the key after the grace period. During the grace period the old key remains fully functional; after 1 hour Redis deletes it and auth naturally fails.

2. **Misleading "asynchronously" comment:** The `r.hset()` call in `authenticate_api_key` is synchronous (blocks until Redis responds). The comment "Update last used timestamp asynchronously" was inaccurate. Changed to "Update last used timestamp".

## Review Notes
- The INCR + conditional EXPIRE rate limiting pattern has a known race condition: if the process crashes between INCR (when count == 1) and EXPIRE, the rate limit key will never expire. This is a well-documented limitation of this simple pattern. A more robust approach would use a Lua script or the Redis `SET ... EX ... NX` pattern combined with INCR. This is acceptable for a tutorial but worth noting for production use.
- The `track_usage` function calls EXPIRE on every request, resetting the 90-day TTL each time. This is slightly wasteful but functionally correct — the data expires 90 days after the last request on that day.
- The `list_user_keys` function returns key metadata dicts without including the key hash as an identifier, which limits the caller's ability to correlate results. Not a bug, but a design consideration for real implementations.
