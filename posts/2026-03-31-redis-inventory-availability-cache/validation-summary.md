# Validation Summary: How to Build an Inventory Availability Cache with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (hashes, sorted sets, pipelines, Lua scripting)
- Python (redis-py client library)
- SQL (basic SELECT for cache warm-up)

## Sources Consulted
- Redis HSET, HGET, HGETALL, HINCRBY command documentation: https://redis.io/docs/latest/commands/hset/
- Redis ZADD, ZRANGEBYSCORE command documentation: https://redis.io/docs/latest/commands/zadd/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/
- redis-py Pipeline documentation: https://redis-py.readthedocs.io/en/stable/advanced_features.html#pipelines
- redis-py `register_script` documentation: https://redis-py.readthedocs.io/en/stable/commands.html#redis.commands.core.CoreCommands.register_script

## Issues Found

### 1. Bug in `release_reservation` function
**What was wrong:** The line `new_qty = pipe.hincrby(f"inventory:{sku}", "qty", qty)` assigned the return value of a pipeline command to `new_qty`. In redis-py, pipeline commands return the Pipeline object itself (for method chaining), not the command result. The actual results are only available from the list returned by `pipe.execute()`. The variable `new_qty` therefore held a Pipeline object, not an integer. The code then made a separate `r.hget` call to re-fetch the quantity, introducing a race condition between the HINCRBY and the sorted set update.

**What was changed:** Removed the misleading assignment from `pipe.hincrby()`. Instead, captured the return value of `pipe.execute()` and extracted the HINCRBY result (`result[0]`) to get the new quantity. Used that value directly in the `ZADD` call, eliminating both the misleading variable and the race condition from the extra `hget` round-trip.

## Review Notes
- The Lua script in "Atomic Reservation" accesses the key `inventory:stock_levels` directly by name rather than passing it via `KEYS[]`. This works on single-node Redis but would fail in Redis Cluster, which requires all accessed keys to be declared in `KEYS`. For a single-node tutorial this is acceptable, but worth noting for readers who may deploy to a cluster.
- `zrangebyscore` is still functional in redis-py but newer versions (4.2+) encourage using `zrange` with `byscore=True`. The current usage is not broken but may be deprecated in future redis-py releases.
- The `__import__('time').time()` pattern in `set_inventory` is functional but unconventional; a standard `import time` at the top of the file would be more idiomatic. Left as-is since it is technically correct.
