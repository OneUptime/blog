# Validation Summary: How to Use Redis Cloud Fixed Plans vs Flexible Plans

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Cloud (managed Redis service)
- Redis Cloud Essentials (formerly Fixed) plans
- Redis Cloud Pro (formerly Flexible) plans
- Redis Stack modules (RediSearch, RedisJSON, RedisTimeSeries, RedisBloom)
- Redis Cloud console (backup/import)

## Sources Consulted
- Redis Cloud documentation on subscription types: https://redis.io/docs/latest/operate/rc/subscriptions/
- Redis Cloud Essentials documentation: https://redis.io/docs/latest/operate/rc/subscriptions/view-essentials-subscription/
- Redis Cloud Pro documentation: https://redis.io/docs/latest/operate/rc/subscriptions/view-pro-subscription/
- Redis Cloud pricing page: https://redis.io/pricing
- RedisGraph deprecation notice (end-of-life January 31, 2025): https://redis.io/blog/redisgraph-eol/
- Redis Cloud blocked commands documentation: https://redis.io/docs/latest/operate/rc/databases/
- redis-cli documentation for --rdb and --pipe flags: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found

1. **Outdated plan naming (Fixed/Flexible)**: The post used the legacy names "Fixed" and "Flexible" throughout. Redis Cloud renamed these tiers to "Essentials" and "Pro" respectively. Updated all references to use the current names while noting the old names.

2. **Incorrect claim that Fixed plans have dedicated resources**: The post stated Fixed plans offer "Dedicated resources - no noisy neighbors." Essentials (Fixed) plans actually run on shared, multi-tenant infrastructure. Changed to "Shared infrastructure - runs on multi-tenant clusters."

3. **Incorrect free tier size in "Available sizes" line**: The post listed "from 250 MB (free tier)" but the free tier is 30 MB, not 250 MB. Fixed to "from 30 MB (free tier)."

4. **RedisGraph listed as available module**: RedisGraph reached end-of-life on January 31, 2025 and was removed from Redis Stack. Replaced with RedisBloom in the module list.

5. **Incorrect migration step using `redis-cli --rdb` and `redis-cli --pipe`**: `redis-cli --rdb` requires SYNC which is blocked on Redis Cloud managed instances. Additionally, `redis-cli --pipe` expects Redis protocol (RESP) format input, not RDB binary files, so the export/import steps were incompatible. Replaced with the correct approach: using the Redis Cloud console's backup and import features.

6. **`REPLICAOF` example won't work on Redis Cloud**: The `REPLICAOF` command is blocked on Redis Cloud managed instances (classified as @admin, @dangerous). Removed the non-functional code example and added a note explaining that these commands are blocked and that migration should be done through the console or API.

7. **Confusing parenthetical about previous names**: The intro said plans were "(previously called 'Annual' or 'Pay-as-you-go')" which conflates billing terms with plan names. Corrected to clearly state the naming: Essentials (formerly Fixed) and Pro (formerly Flexible).

## Review Notes
- The pricing figures (e.g., ~$7/month for 250 MB, ~$60-80 for a Pro database) are approximate and may drift over time. They were not changed as the post presents them as estimates.
- The post's title still references "Fixed Plans vs Flexible Plans" which are the legacy names. This was not changed since it's the post's primary identifier, but a future update could rename the post to use current terminology.
- Redis Cloud also offers "Essentials with Redis Flex" plans that extend Essentials up to 100 GB using tiered storage. The post does not mention this tier, which could be a useful addition in a future update.
