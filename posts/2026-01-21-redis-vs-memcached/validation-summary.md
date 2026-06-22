# Validation Summary: Redis vs Memcached: Which Cache to Choose

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Redis Open Source
- Memcached
- redis-py
- python-memcached
- pymemcache
- Redis Cluster
- Redis Sentinel
- Redis persistence (RDB and AOF)
- AWS ElastiCache

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis keys and values documentation: https://redis.io/docs/latest/develop/using-commands/keyspace/
- Redis strings documentation: https://redis.io/docs/latest/develop/data-types/strings/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis latency and benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/ and https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- Redis ZREVRANGE command documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis transactions documentation: https://redis.io/docs/latest/develop/using-commands/transactions/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- redis-py documentation: https://redis.readthedocs.io/en/stable/ and https://redis.io/docs/latest/develop/clients/redis-py/
- Memcached basic protocol documentation: https://docs.memcached.org/protocols/basic/
- Memcached configuration documentation: https://docs.memcached.org/serverguide/configuring/
- Memcached use cases documentation: https://docs.memcached.org/userguide/usecases/
- Memcached warm restart documentation: https://docs.memcached.org/features/restart/
- Memcached flash storage documentation: https://docs.memcached.org/features/flashstorage/
- pymemcache documentation: https://pymemcache.readthedocs.io/en/latest/
- AWS ElastiCache pricing and node type documentation: https://aws.amazon.com/elasticache/pricing/ and https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.SupportedTypes.html

## Issues Found
- Replaced `r.zrevrange(...)` with `r.zrange(..., desc=True, withscores=True)` because Redis marks the `ZREVRANGE` command as deprecated as of Redis 6.2.
- Updated the Memcached restart claim to account for Memcached warm restart. Memcached still does not provide Redis-style durable persistence, but modern Memcached can recover cache contents across compatible clean restarts.
- Changed "No memory fragmentation" to "Minimizes external memory fragmentation" because Memcached's slab allocator reduces fragmentation but can still waste memory through slab/internal fragmentation.
- Changed "Automatic slot rebalancing" to "Online slot resharding and rebalancing" because Redis Cluster supports live reconfiguration, but open-source Redis Cluster does not automatically rebalance slots by itself.
- Changed "Cross-slot transactions with hash tags" to "Same-slot transactions with hash tags" because Redis Cluster multi-key operations and transactions require all keys to hash to the same slot.
- Updated the AWS service label from "ElastiCache for Redis" to "ElastiCache for Redis OSS" and made the `cache.t3.micro` starting-price note region-dependent.

## Review Notes
Benchmark and latency figures are plausible illustrative values, but actual results depend heavily on hardware, network, protocol, payload size, persistence settings, TLS, pipelining, and client configuration. The Redis rate-limiting example is syntactically valid, but production implementations should also consider duplicate timestamp members and whether to use Lua or Redis Functions for stricter atomic semantics.
