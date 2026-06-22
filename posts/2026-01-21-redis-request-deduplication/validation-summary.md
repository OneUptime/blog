# Validation Summary: How to Implement Request Deduplication with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis
- Redis Lua scripting
- redis-py
- Python
- Flask
- HMAC tokens
- Distributed message processing and idempotency

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis distributed locks documentation: https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Python hmac documentation: https://docs.python.org/3/library/hmac.html
- Python json documentation: https://docs.python.org/3/library/json.html
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/

## Issues Found
- Redis `SETEX` was used in multiple examples. Redis marks `SETEX` as deprecated as of Redis 2.6.12 in favor of `SET` with the `EX` argument, so the examples now use `redis.set(..., ex=...)` or Lua `SET ... EX`.
- Pattern 2 checked `GET` and later wrote the processed result, which allowed concurrent identical requests to both process. The example now atomically reserves the fingerprint with `SET` using `NX` and `EX`.
- Pattern 2 treated falsey cached results as missing results. The example now checks `cached is not None`.
- Pattern 4 claimed exactly-once message processing. Redis deduplication can support idempotent/effectively-once handling for completed message IDs, but it cannot by itself guarantee true exactly-once side effects across crashes, acknowledgements, and downstream systems. The section wording, class name, and conclusion were updated to idempotent/message-deduplication language.
- Pattern 4 released locks with a plain `DEL`, which could delete another worker's lock after expiration and reacquisition. The example now stores a random lock token and releases the lock with a Lua compare-and-delete script.
- Pattern 5 generated an HMAC signature but never verified it during validation. The token service now reconstructs the signed payload from Redis, verifies it with `hmac.compare_digest`, and validates context before atomically marking the token as used.
- Pattern 5 allowed missing context fields to pass validation. The context check now requires stored context values to match the request context.
- Pattern 1 allowed failed idempotency retries by deleting the key, which could remove a newer pending record. The example now restarts failed records with an atomic Lua check instead of deleting blindly.

## Review Notes
The examples are syntactically valid Python after the edits. The implementations are still illustrative and should be adapted for production concerns such as Redis outages, handler timeouts longer than lock TTLs, downstream transactional boundaries, and message acknowledgement semantics.
