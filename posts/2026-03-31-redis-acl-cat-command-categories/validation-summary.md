# Validation Summary: How to Use ACL CAT in Redis to List Available Command Categories

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (ACL system, introduced in Redis 6.0)
- Redis ACL CAT command
- Redis ACL SETUSER command
- Redis command categories for access control

## Sources Consulted
- Official Redis ACL CAT documentation: https://redis.io/docs/latest/commands/acl-cat/
- Official Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Official Redis SUNIONSTORE documentation: https://redis.io/docs/latest/commands/sunionstore/
- Official Redis GETDEL documentation: https://redis.io/docs/latest/commands/getdel/
- Official Redis FLUSHDB documentation: https://redis.io/docs/latest/commands/flushdb/

## Issues Found

### 1. `sunionstore` incorrectly listed in `ACL CAT read` output (High severity)
- **What was wrong:** `sunionstore` was listed as item 3 in the example output for `ACL CAT read`. SUNIONSTORE stores the union of sets into a destination key — it is a write operation categorized under `@write @set @slow`, not `@read`.
- **What was changed:** Replaced `sunionstore` with `srandmember`, which is a genuine `@read` command (`@read @set @slow`).

### 2. `getdel` incorrectly listed in `ACL CAT read` output (High severity)
- **What was wrong:** `getdel` was listed as item 1 in the example output for `ACL CAT read`. GETDEL retrieves a value and then deletes the key — it is categorized under `@write @string @fast`, not `@read`.
- **What was changed:** Replaced `getdel` with `get`, which is a genuine `@read` command (`@read @string @fast`).

### 3. `flushdb` incorrectly listed in `ACL CAT admin` output (Medium severity)
- **What was wrong:** `flushdb` was listed as item 8 in the example output for `ACL CAT admin`. Per official Redis documentation, FLUSHDB belongs to `@keyspace @write @slow @dangerous` — it is not in the `@admin` category.
- **What was changed:** Replaced `flushdb` with `save` in the admin category output, as SAVE is a genuine `@admin` command.

### 4. Incorrect claim about FLUSHDB categories (Medium severity)
- **What was wrong:** The post stated "FLUSHDB appears in both `admin` and `dangerous`" and listed `ACL CAT admin` as a category to check for FLUSHDB. Per official docs, FLUSHDB is in `@dangerous`, `@keyspace`, `@write`, and `@slow` — not `@admin`.
- **What was changed:** Updated the example to check `ACL CAT dangerous`, `ACL CAT keyspace`, and `ACL CAT write`. Updated the text to state FLUSHDB appears in `dangerous`, `keyspace`, and `write`.

## Review Notes
- The ACL SETUSER examples omit the `&*` channel permission pattern (introduced in Redis 6.2). Without it, users won't have Pub/Sub channel access. This is not strictly an error (the commands are valid), but for completeness, examples targeting Redis 6.2+ could include `&*` for full channel access.
- The category list shows 21 categories, which is correct for a vanilla Redis installation. Redis installations with modules (RedisJSON, RediSearch, RedisTimeSeries, etc.) may show additional categories such as `json`, `search`, `tdigest`, `bloom`, `cuckoo`, `topk`, `cms`, and `timeseries`.
- The `fast` and `slow` category descriptions are reasonable simplifications. Redis does not publish formal prose definitions for these categories, but they correlate with O(1) vs O(N)+ command complexity.
