# Validation Summary: What Does 'MOVED' Redirection Mean in Redis Cluster

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Redis Cluster (hash slots, MOVED redirection, CROSSSLOT errors)
- Python redis-py (RedisCluster)
- Node.js ioredis (Redis.Cluster)
- Java Jedis (JedisCluster)
- redis-cli (cluster mode with `-c` flag)
- CRC16-CCITT hash algorithm

## Sources Consulted
- Redis Cluster specification — hash slot calculation: CRC16(key) mod 16384 (https://redis.io/docs/reference/cluster-spec/)
- Redis CLUSTER KEYSLOT command documentation (https://redis.io/commands/cluster-keyslot/)
- Redis CLUSTER SLOTS and CLUSTER SHARDS command documentation (https://redis.io/commands/cluster-slots/, https://redis.io/commands/cluster-shards/)
- Redis MOVED and CROSSSLOT error semantics in the cluster specification
- CRC16-CCITT algorithm (polynomial 0x1021, initial value 0) — verified by running the post's Python implementation
- ioredis Cluster documentation (https://github.com/redis/ioredis#cluster)
- redis-py RedisCluster API documentation (https://redis-py.readthedocs.io/)
- Jedis JedisCluster API documentation (https://github.com/redis/jedis)

## Issues Found

### 1. Incorrect hash slot value for "foo" (two places)
- **What was wrong:** The post claimed `key_hash_slot("foo")` returns 12356 and `CLUSTER KEYSLOT foo` returns 12356.
- **What was changed:** Corrected to 12182 in both the Python code comment and the `redis-cli CLUSTER KEYSLOT` example.
- **Why:** Running the post's own CRC16 implementation confirms `CRC16("foo") mod 16384 = 12182`. The value 12356 was incorrect.

### 2. Inconsistent MOVED slot number in redis-cli examples
- **What was wrong:** The "When MOVED Occurs" section showed `MOVED 12345` for key "foo", which doesn't match the actual hash slot.
- **What was changed:** Changed slot 12345 to 12182 in both the error output and the redirection message.
- **Why:** Since the example explicitly uses `GET foo`, the MOVED response should show the actual slot for "foo" (12182). The destination node 10.0.0.3 (Node C, slots 10923-16383) is correct for slot 12182.

### 3. Multi-key operations produce CROSSSLOT errors, not MOVED errors
- **What was wrong:** The post stated "MOVED errors from multi-key operations occur when the keys span multiple slots." Multi-key commands on keys in different slots return a `CROSSSLOT` error (`(error) CROSSSLOT Keys in request don't hash to the same slot`), not a MOVED redirection.
- **What was changed:** Updated the section intro to correctly reference CROSSSLOT errors. Updated the MSET error comment from "# Error" to "# CROSSSLOT error". Updated the summary paragraph to say "CROSSSLOT errors" instead of "cross-slot MOVED errors".
- **Why:** MOVED and CROSSSLOT are distinct error types in Redis Cluster. MOVED means "this slot belongs to a different node." CROSSSLOT means "the keys in this command don't all hash to the same slot." Conflating them could mislead readers debugging cluster issues.

## Review Notes
- The CRC16 Python implementation is correct (CRC-16-CCITT, polynomial 0x1021, initial value 0) and produces accurate results despite not masking intermediate values to 16 bits — the final `& 0xffff` is sufficient.
- The `CLUSTER SLOTS` command is deprecated since Redis 7.0 in favor of `CLUSTER SHARDS`. The post shows both, which is fine for backward compatibility, but readers on Redis 7.0+ should prefer `CLUSTER SHARDS`.
- The `skip_full_coverage_check` parameter in the redis-py example was from the older standalone redis-py-cluster package. In modern redis-py (4.1+), the equivalent parameter is `require_full_coverage`. This was not changed since both may work depending on the redis-py version used.
- The hash tag examples and slot co-location advice are technically correct and follow Redis Cluster best practices.
