# Validation Summary: How to Configure LRU and LFU Eviction in Redis

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Redis
- Redis eviction policies
- Redis configuration
- redis-cli
- redis-py
- Python

## Sources Consulted
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis example redis.conf: https://raw.githubusercontent.com/redis/redis/unstable/redis.conf
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/

## Issues Found
- The post claimed `maxmemory` can be set as a percentage with `maxmemory 75%`. Redis `maxmemory` is documented as a memory size, while percentage syntax applies to other settings such as client memory limits. Changed the example to show a byte value instead.
- The post said Redis supports eight eviction policies. Current Redis documentation also includes `allkeys-lrm` and `volatile-lrm`. Changed the wording to "several eviction policies" and added the LRM rows.
- The LFU decay explanation said counters are halved. Redis documents LFU decay as decrementing the counter after the configured time when sampled. Updated the comments accordingly.
- The LFU log factor examples used incorrect saturation claims. Replaced them with values matching the Redis documentation table.
- The LFU counter simulation used a deterministic threshold rather than a probabilistic increment. Updated it to use a seeded random number and Redis's documented probability formula.
- The volatile/allkeys decision flow had the TTL decision backwards for mixed persistent/cache data. Changed it to choose volatile policies when keys without TTL need protection.

## Review Notes
The Python snippets use current redis-py APIs such as `redis.Redis`, `set`, `setex`, `exists`, `info`, and `config_set`. The demonstration functions require a running Redis server and an appropriately low `maxmemory` setting to visibly trigger eviction.
