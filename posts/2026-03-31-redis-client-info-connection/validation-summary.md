# Validation Summary: How to Use CLIENT INFO in Redis to Get Connection Details

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis (CLIENT INFO, CLIENT LIST, CLIENT SETNAME, CLIENT NO-EVICT commands)
- Python (redis-py library)

## Sources Consulted
- Redis official documentation for CLIENT INFO: https://redis.io/docs/latest/commands/client-info/
- Redis official documentation for CLIENT LIST (field and flag reference): https://redis.io/docs/latest/commands/client-list/
- redis-py library source code for `client_info()` method

## Issues Found
1. **Client flags `t` and `T` were swapped.** The post listed `t` as "CLIENT NO-TOUCH enabled" and `T` as "Tracking enabled (client-side cache)". Per the official Redis CLIENT LIST documentation, lowercase `t` means tracking is enabled for client-side caching, and uppercase `T` means the client will not touch the LRU/LFU of keys it accesses (NO-TOUCH). Fixed by swapping the two descriptions.

2. **Incorrect field names in example output.** The example CLIENT INFO output used `library-name=` and `library-ver=`, but the actual Redis output fields are `lib-name=` and `lib-ver=` (as documented in CLIENT LIST and set via CLIENT SETINFO). Fixed the example output to use the correct field names.

## Review Notes
- The Field Reference table omits several fields that appear in the example output and in newer Redis versions: `ssub` (shard subscriptions, 7.0.3+), `watch` (watched keys, 7.4+), `argv-mem`, `multi-mem`, `tot-mem`, `rbs`, `rbp`, `events`, `lib-name`, `lib-ver`. These are present in the example but not documented in the table. This is a completeness gap rather than an error, as the post focuses on the most commonly used fields.
- The Client Flags table covers only a subset of all possible flags. Additional flags exist (e.g., `A` for close-ASAP, `O` for MONITOR mode, `U` for Unix domain socket, etc.) but the post reasonably focuses on the most common ones.
- CLIENT INFO was introduced in Redis 6.2.0. The post does not mention a specific version, which avoids a potential version error but means readers don't know the minimum required version.
- The Python redis-py `client_info()` method was verified to exist and work as described.
