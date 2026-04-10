# Validation Summary: How to Use Redis Streams with Jedis in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Streams
- Java
- Jedis (Java Redis client, v5.x)
- Redis consumer groups

## Sources Consulted
- Jedis GitHub repository source code (https://github.com/redis/jedis) — verified class names, method signatures, constants, and return types against actual source files
- `StreamEntryID.java` — verified constants (`NEW_ENTRY`, `XREAD_NEW_ENTRY`, `XGROUP_LAST_ENTRY`, `XREADGROUP_UNDELIVERED_ENTRY`) and deprecated aliases
- `StreamPendingSummary.java` — verified getter method names (`getTotal()`, `getMinId()`, `getMaxId()`)
- Jedis `UnifiedJedis` / `JedisPooled` — verified method signatures for `xadd`, `xread`, `xreadGroup`, `xgroupCreate`, `xpending`, `xautoclaim`, `xack`, `xtrim`
- Redis official documentation for Streams commands (https://redis.io/docs/latest/commands/?group=stream)

## Issues Found

1. **`StreamEntryID.LAST_ENTRY` is deprecated (line 66)**: Changed to `StreamEntryID.XGROUP_LAST_ENTRY`. The old constant still works but is deprecated in current Jedis; the replacement is the more specific `XGROUP_LAST_ENTRY` constant.

2. **`StreamEntryID.UNRECEIVED_ENTRY` is deprecated (line 80)**: Changed to `StreamEntryID.XREADGROUP_UNDELIVERED_ENTRY`. Same situation — the old name works but is deprecated in favor of the more explicit constant name.

3. **`pending.getCount()` does not exist (line 107)**: Changed to `pending.getTotal()`. The `StreamPendingSummary` class exposes the pending count via `getTotal()`, not `getCount()`. This would cause a compilation error.

4. **`StreamAutoClaimResponse` class does not exist (lines 117-118)**: The `xautoclaim` method returns `Map.Entry<StreamEntryID, List<StreamEntry>>`, not a `StreamAutoClaimResponse`. Removed the non-existent import and fixed the return type. The `Map.Entry` key is the next cursor ID for iteration; the value is the list of claimed entries.

5. **`StreamEntryID.XAUTOCLAIM_ENTRY` does not exist (line 123)**: Changed to `new StreamEntryID()` which produces the `"0-0"` entry ID, meaning "start from the beginning of the pending entries list."

6. **`claimed.getEntries()` does not exist (line 127)**: Changed to `claimed.getValue()` since the return type is `Map.Entry<StreamEntryID, List<StreamEntry>>` and `.getValue()` returns the `List<StreamEntry>` of claimed entries.

## Review Notes
- `JedisPooled` is marked as deprecated on the latest Jedis master branch in favor of `RedisClient`, but it remains functional and is still the standard class in current stable releases (5.x). No change made since this is still the widely-used approach.
- The `xtrim("orders", 10000, false)` call uses the older overload. A newer `xtrim(String, XTrimParams)` overload exists that supports `MINID` strategy and `LIMIT` option, but the older overload is still valid.
- The blog correctly handles the BUSYGROUP error when creating consumer groups that may already exist.
- The overall architecture pattern (produce with XADD, consume with XREADGROUP, acknowledge with XACK, reclaim with XAUTOCLAIM) is correct and follows Redis best practices.
