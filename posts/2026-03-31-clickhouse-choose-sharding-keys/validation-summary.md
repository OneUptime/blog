# Validation Summary: How to Choose Sharding Keys for Distributed Tables in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Distributed table engine
- ClickHouse hash functions (`intHash64`, `cityHash64`, `rand()`)
- ClickHouse virtual columns (`_shard_num`)
- SQL / DDL for distributed clusters

## Sources Consulted
- ClickHouse Distributed Table Engine docs: https://clickhouse.com/docs/engines/table-engines/special/distributed
- ClickHouse hash functions docs: https://clickhouse.com/docs/sql-reference/functions/hash-functions
- ClickHouse random functions docs: https://clickhouse.com/docs/sql-reference/functions/random-functions

## Issues Found
No technical issues found.

Verified claims:
- `Distributed(cluster, database, table[, sharding_key[, policy_name]])` signature is correct.
- `intHash64` is a valid ClickHouse function that produces a uniform 64-bit hash from integers.
- `cityHash64` is a valid ClickHouse hash function and accepts multiple arguments, so `cityHash64(tenant_id, user_id)` is valid.
- `_shard_num` is a valid virtual column on Distributed tables (documented, not deprecated; `shardNum()` exists as an alternative but both are concurrently valid).
- `rand()` is a valid sharding expression for purely even distribution.
- The claim that changing the sharding key requires re-inserting to rebalance existing data is accurate — the Distributed engine is a routing layer and does not move data already stored on local shards.

## Review Notes
- `_shard_num` remains documented and supported, but newer ClickHouse code can also use the `shardNum()` function. Both work; the post's usage is fine.
- The post's guidance (hash high-cardinality columns, match the sharding key to primary query filters, verify evenness) aligns with ClickHouse best practices.
