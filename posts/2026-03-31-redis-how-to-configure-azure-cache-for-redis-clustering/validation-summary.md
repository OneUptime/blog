# Validation Summary: How to Configure Azure Cache for Redis Clustering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cache for Redis (Premium tier)
- Redis Cluster protocol (CRC16 hashing, 16,384 hash slots)
- Azure CLI (`az redis`)
- Terraform (`azurerm_redis_cache` resource)
- StackExchange.Redis (.NET)
- redis-py (Python) with cluster support
- ioredis (Node.js) cluster mode
- Azure Monitor metrics

## Sources Consulted
- Azure CLI `az redis create` reference: https://learn.microsoft.com/en-us/cli/azure/redis?view=azure-cli-latest#az-redis-create
- Azure CLI `az redis update` reference: https://learn.microsoft.com/en-us/cli/azure/redis?view=azure-cli-latest#az-redis-update
- Azure Cache for Redis overview and tier comparison: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview
- Azure Cache for Redis scaling documentation: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-scale
- Azure Cache for Redis clustering configuration: https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-premium-clustering
- Terraform `azurerm_redis_cache` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache
- StackExchange.Redis ConfigurationOptions source: https://github.com/StackExchange/StackExchange.Redis/blob/main/src/StackExchange.Redis/ConfigurationOptions.cs
- redis-py cluster documentation: https://redis.readthedocs.io/en/stable/clustering.html
- ioredis ClusterOptions API docs: https://redis.github.io/ioredis/interfaces/ClusterOptions.html

## Issues Found

1. **Incorrect hashing terminology**: The post described Redis Cluster data distribution as "consistent hashing." Redis Cluster uses CRC16 hashing over 16,384 hash slots, not consistent hashing (which is a different algorithm, e.g., Ketama). Changed to "CRC16 hashing over 16,384 hash slots."

2. **Incorrect maximum shard size**: The post stated "up to 53 GB per shard," which corresponds to P4. The P5 tier provides 120 GB per shard. Corrected to "up to 120 GB per shard on P5."

3. **Incomplete tier availability**: The post stated clustering is "only available on the Premium tier." Clustering is also available on Enterprise and Enterprise Flash tiers. Corrected in both the prerequisites and summary sections.

4. **Outdated shard count limit**: The post stated 1-10 shards maximum. While 10 shards is the GA limit, up to 30 shards is available in preview. Added this clarification.

5. **Incorrect `az redis update` syntax for shard count**: The post used `--shard-count 3` with `az redis update`, but this flag only exists on `az redis create`. The correct syntax for updating is `--set shardCount=N`. Fixed in both the "Enabling Clustering" and "Scaling Shards" sections.

6. **Non-existent Azure CLI command**: The post used `az redis list-upgrade-notifications` to "view shard distribution and memory per shard." This command does not exist in the `az redis` command group. Replaced with the correct `az monitor metrics list` command for retrieving per-shard metrics.

7. **Inaccurate restart claim**: The post stated "Enabling clustering on an existing cache requires a restart, which causes brief downtime." Microsoft documentation indicates the cache remains available during scaling operations, though brief connection blips may occur. Corrected the language.

8. **Misleading pipeline comment**: The Python code comment stated "Pipeline works within same shard (same hash tag)," implying pipelines are restricted to a single shard. In redis-py's cluster client, pipelines automatically route commands to the correct shard and work across shards. Only multi-key commands within a pipeline require same-shard keys. Corrected the comment.

## Review Notes
- The StackExchange.Redis code correctly uses `Ssl` (not the deprecated `UseSsl`), port 6380 for TLS, and `SslProtocols.Tls12`.
- The redis-py `RedisCluster` constructor parameters are all correct and current.
- The ioredis `Redis.Cluster` options (`redisOptions`, `dnsLookup`, `slotsRefreshTimeout`) are all valid and correctly used.
- The Terraform `azurerm_redis_cache` resource configuration has correct field names and values.
- The hash tag examples correctly demonstrate CRC16 slot co-location using `{tag}` syntax.
- The post could benefit from mentioning Azure Cache for Redis Enterprise tier in more detail in a future update, as Enterprise tier clustering behaves somewhat differently (always clustered, different scaling model).
