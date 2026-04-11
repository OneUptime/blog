# Validation Summary: How to Build a Flash Deal Countdown Timer with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (TTL, keyspace notifications, sorted sets, hashes, pipelines, Lua scripting)
- Python (redis-py client library)

## Sources Consulted
- Redis TTL command documentation: https://redis.io/commands/ttl/
- Redis EXPIRE command documentation: https://redis.io/commands/expire/
- Redis keyspace notifications documentation: https://redis.io/docs/manual/keyspace-notifications/
- Redis EVAL (Lua scripting) documentation: https://redis.io/commands/eval/
- Redis ZADD / ZRANGEBYSCORE documentation: https://redis.io/commands/zadd/ and https://redis.io/commands/zrangebyscore/
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found

### 1. Race condition: deal hash and marker key share the same TTL (logic bug)
**What was wrong:** Both `deal:{deal_id}` (the hash containing deal data) and `deal:ended:{deal_id}` (the marker key for keyspace notifications) were set with the same `duration_seconds` TTL. When the marker key expired and triggered the `handle_deal_expiry` handler, the hash had also already expired. The handler's `hset` call (`r.hset(f"deal:{deal_id}", "active", "0")`) would then create a new ghost hash key containing only `{"active": "0"}` with no TTL — a permanent memory leak.

**What was changed:**
- Removed `pipe.expire(f"deal:{deal_id}", duration_seconds)` from `create_flash_deal` so the deal hash persists and is available for the expiry handler to update.
- Changed `get_time_remaining` to check the marker key's TTL (`deal:ended:{deal_id}`) instead of the hash key's TTL, since the hash no longer expires.
- Updated the Lua script in `purchase_deal` to check the marker key's TTL (`KEYS[2]`) instead of the hash key's TTL, passing the marker key as a second key argument.

**Why:** The marker key `deal:ended:{deal_id}` is the canonical source of deal expiry (it triggers keyspace notifications). The deal hash should outlive the marker so the expiry handler can properly mark it inactive. This also makes the code consistent with the data model description, which does not mention TTL on the hash key.

## Review Notes
- `zrangebyscore` is deprecated in redis-py >= 4.2.0 in favor of `zrange(name, min, max, byscore=True)`. The current code still works but may trigger deprecation warnings with newer redis-py versions.
- The `stock_field = "stock"` variable in `purchase_deal` is defined but unused. This is a minor code quality issue, not a functional bug.
- The deal hash keys now persist indefinitely after the fix. In a production system, you would want a cleanup mechanism (e.g., periodic job or a longer TTL) to eventually remove old deal data. This is outside the scope of the tutorial.
- The keyspace notification configuration (`notify-keyspace-events "Ex"`) uses `CONFIG SET`, which is runtime-only. For persistence across restarts, it should also be set in `redis.conf`. This is a deployment consideration rather than a code error.
