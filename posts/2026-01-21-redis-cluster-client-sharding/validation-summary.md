# Validation Summary: How to Use Redis Cluster with Client-Side Sharding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Cluster
- Redis hash slots and hash tags
- Redis Lua scripting with EVAL
- Redis SCAN
- redis-py RedisCluster
- ioredis Redis.Cluster
- Python
- Node.js / JavaScript
- Consistent hashing

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis CLUSTER KEYSLOT command documentation: https://redis.io/docs/latest/commands/cluster-keyslot/
- redis-py clustering documentation: https://redis.readthedocs.io/en/stable/clustering.html
- redis-py command API documentation: https://redis.readthedocs.io/en/stable/commands.html
- redis-py RedisCluster source documentation: https://redis.readthedocs.io/en/stable/_modules/redis/cluster.html
- ioredis Cluster documentation: https://github.com/redis/ioredis

## Issues Found
- The Python RedisCluster constructor used `skip_full_coverage_check=True`, which is not the current redis-py argument. Changed it to `require_full_coverage=False`, matching redis-py's documented constructor.
- The `get_node_for_key` example treated `cluster_slots()` as a raw Redis array response. Updated it to handle redis-py's parsed slot mapping and return the primary host/port for the matching range.
- The JavaScript hash-slot helpers used a regex and `charCodeAt`, which did not exactly match Redis Cluster's hash-tag algorithm or byte-level CRC16 calculation for all keys. Updated both helpers to follow Redis's first-brace-pair rules and hash UTF-8 bytes via `Buffer.from(...)`.
- The `multi_get` docstring said it executed in parallel even though the method runs slot groups sequentially. Updated the docstring to describe one multi-key command per slot.
- The cross-slot transfer example claimed atomic transfer and WATCH-based optimistic locking, but the code did not use WATCH and Redis Cluster cannot provide atomic multi-key operations across different hash slots. Renamed the method to `transfer`, clarified that only same-slot Lua transfer is atomic, and described the cross-slot path as best-effort with compensation.
- The hybrid sharding example referenced `redis.cluster.ClusterNode` without importing `redis`. Added the missing import.
- The hybrid tenant migration example used a cursor loop that does not match redis-py's cluster scan cursor handling. Replaced it with `scan_iter`, which handles per-node cursors.
- The "GOOD" prefix examples used hash tags such as `{session}` and `{cart}`, which would co-locate unrelated sessions or carts into the same slot and create hotspot risk. Changed them to tags that include the relevant identifier.

## Review Notes
- Syntax checks passed for all Python and JavaScript code blocks. Runtime testing against a live Redis Cluster was not performed in this workspace.
- The consistent hashing example is technically valid as a standalone client-side sharding pattern, but it is separate from Redis Cluster's built-in hash-slot sharding and would need migration/rebalancing logic for production use.
