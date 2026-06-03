# Validation Summary: How to Compare MemoryDB vs ElastiCache

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Amazon ElastiCache for Redis OSS
- Amazon MemoryDB
- Redis OSS and Valkey-compatible engines
- AWS CLI
- redis-py
- AWS snapshots, TLS, ACLs, RBAC, IAM authentication, and Multi-Region replication

## Sources Consulted
- AWS MemoryDB Developer Guide: What is MemoryDB - https://docs.aws.amazon.com/memorydb/latest/devguide/what-is-memorydb.html
- AWS MemoryDB Developer Guide: Features of MemoryDB - https://docs.aws.amazon.com/memorydb/latest/devguide/servicename-feature-overview.html
- AWS MemoryDB Developer Guide: Engine versions - https://docs.aws.amazon.com/memorydb/latest/devguide/engine-versions.html
- AWS MemoryDB Developer Guide: Working with shards - https://docs.aws.amazon.com/memorydb/latest/devguide/shards.html
- AWS MemoryDB Developer Guide: In-transit encryption (TLS) - https://docs.aws.amazon.com/memorydb/latest/devguide/in-transit-encryption.html
- AWS MemoryDB Developer Guide: At-Rest Encryption - https://docs.aws.amazon.com/memorydb/latest/devguide/at-rest-encryption.html
- AWS MemoryDB Developer Guide: Authenticating users with ACLs - https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.acls.html
- AWS MemoryDB Developer Guide: MemoryDB Multi-Region - https://docs.aws.amazon.com/memorydb/latest/devguide/multi-region.html
- AWS CLI Command Reference: memorydb create-cluster - https://docs.aws.amazon.com/cli/latest/reference/memorydb/create-cluster.html
- AWS MemoryDB Developer Guide: Restoring from a snapshot - https://docs.aws.amazon.com/memorydb/latest/devguide/snapshots-restoring.html
- AWS ElastiCache Developer Guide: Engine versions and upgrading - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/engine-versions.html
- AWS ElastiCache Developer Guide: Working with shards - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Shards.html
- AWS ElastiCache Developer Guide: Authentication and Authorization - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth-redis.html
- AWS ElastiCache Developer Guide: Authenticating with AUTH - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth.html
- AWS ElastiCache Developer Guide: Global Datastore - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Redis-Global-Datastore.html
- AWS ElastiCache pricing - https://aws.amazon.com/elasticache/pricing/
- AWS MemoryDB pricing - https://aws.amazon.com/memorydb/pricing/
- redis-py documentation: RedisCluster connection parameters - https://redis.readthedocs.io/en/stable/connections.html

## Issues Found
- The post described both services as simply "Redis" services. Updated wording to Redis OSS-compatible services and noted Valkey/Redis OSS engine support, matching current AWS service naming.
- The MemoryDB durability wording said every write is durably stored before acknowledgment with an absolute "no writes are lost" claim. Adjusted it to successful/persisted writes and MemoryDB's designed recovery guarantees, which matches AWS durability language more closely.
- The feature table incorrectly said MemoryDB TLS is always enabled and ACL authentication is strictly required. Corrected this: TLS is configurable, every cluster has an ACL, and non-TLS clusters must use the open-access ACL.
- The feature table listed MemoryDB "Global Datastore." Replaced this with MemoryDB Multi-Region, which is the current MemoryDB cross-Region feature.
- The feature table had outdated engine-version wording. Updated it to include Valkey and current Redis OSS support ranges for ElastiCache and MemoryDB.
- The pricing section used fixed monthly prices, compared a 3-node ElastiCache group with a 6-node MemoryDB cluster, and omitted MemoryDB data-written charges. Replaced the exact numbers with a correct cost pattern that includes node-hours and MemoryDB write charges.
- The security section repeated the incorrect mandatory TLS/auth claims. Updated it to reflect configurable TLS, ACL association, open-access ACL behavior, and always-on at-rest encryption.
- The MemoryDB migration steps implied ACL authentication must always be enabled. Updated the wording to configuring ACL users and TLS as needed.
- The redis-py example used `skip_full_coverage_check=True`, which is not part of the current `redis.cluster.RedisCluster` constructor. Removed that option.

## Review Notes
Pricing changes over time and varies by Region, engine, purchase model, write volume, and support status. The post now avoids hard-coded monthly amounts and describes the billing dimensions readers need to compare using current AWS pricing pages.
