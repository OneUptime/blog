# Validation Summary: How to Configure Redis Clustering in Azure Cache for Redis Premium Tier

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cache for Redis Premium
- Azure CLI
- Redis Cluster
- redis-py
- ioredis
- StackExchange.Redis
- Azure Monitor metrics and alerts

## Sources Consulted
- Microsoft Learn: Azure Cache for Redis retirement and what's new, https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-whats-new
- Microsoft Learn: Scale an Azure Cache for Redis instance and Premium clustering, https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-scale
- Microsoft Learn: Azure CLI `az redis` reference, https://learn.microsoft.com/en-us/cli/azure/redis
- Microsoft Learn: Supported Azure Monitor metrics for Microsoft.Cache/redis, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-cache-redis-metrics
- Redis documentation: Redis Cluster specification, https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis documentation: redis-py connection and RedisCluster usage, https://redis.io/docs/latest/develop/clients/redis-py/connect/
- Redis documentation: ioredis guide, https://redis.io/docs/latest/develop/clients/ioredis/
- StackExchange.Redis documentation: Configuration, https://stackexchange.github.io/StackExchange.Redis/Configuration

## Issues Found
- The post described Azure Cache for Redis Premium clustering as using a cluster proxy and said regular Redis clients could connect while Azure handled routing internally. Premium clustering follows the OSS Redis Cluster protocol, so I changed the architecture description and examples to require cluster-aware clients.
- The Python example used `redis.StrictRedis` for a clustered Premium cache. I changed it to `redis.cluster.RedisCluster`, matching current redis-py cluster usage.
- The Node.js example used a standalone `ioredis` connection. I changed it to `Redis.Cluster` with TLS and password options.
- The Azure CLI create example used `--enable-non-ssl-port false`, but `--enable-non-ssl-port` is a flag that enables the non-TLS port when present. I removed it so the default TLS-only behavior remains.
- The Azure CLI scale-out and scale-in examples used `az redis update --shard-count`, which is not a documented `az redis update` option. I changed these to `--set shardCount=...`.
- The post stated that clustering is for data exceeding 53 GB, but Premium has larger single-node sizes. I changed this to refer generally to the capacity of a single Premium node.
- The portal shard-count text said only `1-10`. I updated it to note that 10 shards is generally available and higher counts are preview in supported configurations.
- The post said Azure's proxy layer handles some cross-shard multi-key commands transparently. I changed this to the OSS Cluster `CROSSSLOT` behavior for Premium clustering.
- The alert comment said "individual shard CPU" while the metric is Redis server load. I changed the wording to "shard server load."
- The summary repeated the incorrect proxy/routing claim. I updated it to say that a cluster-aware client handles routing.
- Azure Cache for Redis is on a retirement timeline as of October 2025. I added a brief caveat recommending Azure Managed Redis for new designs when possible.

## Review Notes
The cost table remains approximate and region-dependent. Future updates should consider replacing static monthly prices with a note to use the Azure pricing calculator.
