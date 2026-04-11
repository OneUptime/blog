# Validation Summary: How to Implement Inventory Reservation with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (WATCH/MULTI/EXEC transactions, hashes, sets, string counters)
- Python (redis-py client library)
- E-commerce inventory reservation pattern

## Sources Consulted
- redis-py official documentation: https://redis.readthedocs.io/en/stable/
- Redis transactions (WATCH/MULTI/EXEC): https://redis.io/docs/latest/develop/interact/transactions/
- Redis EXPIRE command: https://redis.io/docs/latest/commands/expire/
- Redis pipelines and transactions in redis-py: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/

## Issues Found
1. **Critical: TTL on reservation hash causes permanent stock leakage.** The `pipe.expire(f"reservation:{reservation_id}", RESERVATION_TTL)` call set a TTL on the reservation hash. When Redis automatically deletes the hash after expiry, the `inventory:{sku_id}:available` and `inventory:{sku_id}:reserved` counters are NOT restored — they remain decremented/incremented respectively. Furthermore, once the hash is gone, `release_reservation` cannot work because `hgetall` returns an empty dict, making the stock loss permanent. The summary incorrectly claimed "TTL-based expiry automatically releases uncompleted reservations." **Fix:** Removed the `pipe.expire()` call from `reserve_inventory` and the corresponding `pipe.persist()` call from `confirm_reservation`. The `expiry` timestamp field already stored in the hash can be used by a periodic cleanup process to identify and release stale reservations. Updated the summary to accurately describe this approach.

## Review Notes
- The `confirm_reservation` and `release_reservation` functions read the reservation hash and then execute updates in a separate pipeline without WATCH. This means concurrent calls for the same reservation could double-count. For a tutorial this is acceptable, but production code should use WATCH or a Lua script for atomicity.
- The `reservations:{userId}` set is not cleaned up on confirmation — only on release/cancellation. Production code may want to clean this up or move confirmed reservations to a separate set.
- All redis-py API calls (`pipeline`, `watch`, `multi`, `hset` with `mapping`, `decrby`, `incrby`, `sadd`, `srem`, `WatchError`) are verified correct and non-deprecated for redis-py 5.x.
