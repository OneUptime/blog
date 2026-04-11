# Validation Summary: How to Implement Coupon and Promo Code Validation with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Sets, Lua scripting)
- Python (redis-py client library)
- Redis CLI commands

## Sources Consulted
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- Redis HSET, HGETALL, SADD, SISMEMBER, HINCRBY, SCARD command references: https://redis.io/docs/latest/commands/

## Issues Found

### 1. Lua error replies not caught as exceptions in Python (Critical)
**What was wrong:** The Lua script used `{err='NOT_FOUND'}` (and similar) to signal errors. In Redis, returning a table with an `err` field produces an error reply, which causes redis-py to raise a `redis.exceptions.ResponseError` exception. The `redeem_coupon` function checked the return type with `isinstance(result, list)` and fell through to `return {"error": result}` for errors, but this code path would never execute — the exception would be raised before it.

**What was changed:** Wrapped the `redeem_fn()` call in a `try/except redis.exceptions.ResponseError` block so error replies from the Lua script are properly caught and returned as `{"error": str(e)}`.

### 2. Inconsistent data stored in user redemption set (Minor)
**What was wrong:** The Lua script used `redis.call('SADD', KEYS[3], KEYS[1])` which stored the full Redis key (e.g., `coupon:SAVE20`) in the `coupon:user:{userId}` set. The data model describes this set as containing "codes this user has redeemed" (i.e., just the code like `SAVE20`), not full Redis keys.

**What was changed:** Changed `KEYS[1]` to `data['code']` in the SADD call, which uses the code value already stored in the hash, consistent with the data model description.

### 3. Unnecessary `.decode()` check removed (Cleanup)
**What was wrong:** The return line had `result[1].decode() if isinstance(result[1], bytes) else result[1]`. Since the Redis client is initialized with `decode_responses=True`, all return values from Lua scripts are already decoded to Python strings, making the bytes check unnecessary.

**What was changed:** Simplified to just `result[1]` as part of the try/except refactor.

## Review Notes
- The `create_coupon` function does not set a TTL on the hash key. For production use, setting a TTL matching the expiry timestamp would prevent stale coupons from accumulating in Redis. This is a design consideration rather than a bug.
- The `validate_coupon` function (check-without-redeeming) is not atomic — a coupon could be redeemed by another user between the HGETALL and SISMEMBER calls. This is acceptable for a read-only validation check but worth noting.
- All Redis commands (HSET, HGETALL, SADD, SISMEMBER, HINCRBY, SCARD) are used correctly per Redis documentation.
- The Lua script correctly uses KEYS and ARGV parameters, following Redis best practices for cluster compatibility.
