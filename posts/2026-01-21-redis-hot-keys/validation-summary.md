# Validation Summary: How to Handle Hot Keys in Redis

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Redis
- Redis Cluster
- redis-py
- ioredis
- Python
- Node.js
- Client-side caching
- Read replicas
- Cache stampede prevention

## Sources Consulted
- Redis keyspace notifications documentation: https://redis.io/docs/latest/develop/pubsub/keyspace-notifications/
- Redis CLI documentation for hot key sampling: https://redis.io/docs/latest/develop/tools/cli/
- Redis SLOWLOG GET command documentation: https://redis.io/docs/latest/commands/slowlog-get/
- Redis SET command documentation and locking pattern: https://redis.io/docs/latest/commands/set/
- Redis TTL command documentation: https://redis.io/docs/latest/commands/ttl/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis CLUSTER NODES command documentation: https://redis.io/docs/latest/commands/cluster-nodes/
- Redis CLUSTER KEYSLOT command documentation: https://redis.io/docs/latest/commands/cluster-keyslot/
- redis-py clustering documentation: https://redis.readthedocs.io/en/stable/clustering.html
- redis-py client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- ioredis official repository documentation: https://github.com/redis/ioredis

## Issues Found
- Keyspace notifications were described as tracking key access. Redis keyspace notifications report keyspace/keyevent operations and do not count pure reads such as GET, so the wording was changed to key modification events.
- The Node.js cluster balance check used `this.redis.cluster` to detect a cluster connection. In ioredis, cluster clients expose `nodes("master")`; the guard was changed to check for the `nodes` method and to handle empty node lists and zero averages safely.
- The Python replica router used a dictionary keyed by Redis key to map `mget` results back to positions. Duplicate keys would overwrite earlier positions, so the mapping was changed to preserve positional arrays.
- The cache stampede lock released the Redis lock with a bare `DEL`, which can delete a lock acquired by another client after expiration. The code now uses a unique token and a Lua compare-and-delete script, matching Redis' documented safer unlock pattern.
- The probabilistic early recompute comment did not match the implemented probability condition. The formula comment was corrected.
- The Python return annotation used `Tuple[any, bool]`; this was corrected to `Tuple[Any, bool]`.

## Review Notes
The code examples are illustrative and assume appropriately configured Redis deployments, replicas, and Redis Cluster nodes. The post could later mention Redis CLI `--hotkeys`, which is available only with LFU maxmemory policies, but the existing guide is technically valid without adding that section.
