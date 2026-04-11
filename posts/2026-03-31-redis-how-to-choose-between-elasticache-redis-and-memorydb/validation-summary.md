# Validation Summary: How to Choose Between ElastiCache Redis and MemoryDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon ElastiCache for Redis
- Amazon MemoryDB for Redis
- Redis (core commands: SET, HSET, INCR, DECRBY, HINCRBYFLOAT, EXPIRE)
- Python redis-py client (redis.Redis, redis.cluster.RedisCluster)
- Terraform AWS provider (aws_elasticache_replication_group, aws_memorydb_cluster)

## Sources Consulted
- AWS ElastiCache for Redis documentation — https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/
- AWS MemoryDB for Redis documentation — https://docs.aws.amazon.com/memorydb/latest/devguide/
- AWS MemoryDB durability and failover behavior — https://docs.aws.amazon.com/memorydb/latest/devguide/memorydb-compliance.html
- Terraform AWS provider: aws_elasticache_replication_group — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider: aws_memorydb_cluster — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/memorydb_cluster
- redis-py documentation — https://redis-py.readthedocs.io/en/stable/
- Redis modules ecosystem (RediSearch, RedisJSON) — https://redis.io/docs/latest/develop/connect/clients/

## Issues Found

### 1. Incorrect claim that MemoryDB supports Redis modules
- **What was wrong:** The comparison table listed ElastiCache as "Partial (no modules)" and the decision framework stated "Do you need Redis modules (RediSearch, RedisJSON, etc.)? YES -> MemoryDB (full module support)". Neither AWS ElastiCache nor MemoryDB supports third-party Redis modules such as RediSearch, RedisJSON, RedisBloom, or RedisTimeSeries. These modules are available only through Redis Cloud or self-hosted Redis Stack.
- **What was changed:** Updated the table to say "Standard Redis API" for ElastiCache (removing the misleading modules reference). Changed the decision framework entry to clarify that neither service supports modules and to point readers toward Redis Cloud or self-hosted Redis Stack.
- **Why:** Recommending MemoryDB for Redis module support would lead readers to choose a service that does not provide what they need.

### 2. Inaccurate comment about ElastiCache TLS certificates
- **What was wrong:** The Python code comment said `ssl_cert_reqs=None  # ElastiCache uses self-signed cert`. ElastiCache uses Amazon-issued TLS certificates, not self-signed certificates. Setting `ssl_cert_reqs=None` disables certificate verification entirely, which is a security trade-off unrelated to self-signed certificates.
- **What was changed:** Updated the comment to `# Disables cert verification; for production, use a proper CA bundle`.
- **Why:** The original comment implied ElastiCache uses self-signed certificates, which is factually incorrect and could mislead readers about the security model.

## Review Notes
- Pricing figures are approximate and clearly marked as such (~$0.166/hour, ~$0.258/hour). These may drift over time as AWS adjusts pricing, but the relative cost comparison (~55% premium for MemoryDB) is reasonable.
- The failover timing claims (ElastiCache: 1-2 minutes, MemoryDB: under 10 seconds) are reasonable estimates consistent with AWS documentation, though actual times vary by configuration and workload.
- The Terraform snippets use valid resource arguments for the AWS provider. The ElastiCache resource uses the older `num_cache_clusters` parameter which is still supported.
- The redis-py code correctly uses `RedisCluster` for MemoryDB (which always operates in cluster mode) and `redis.Redis` for ElastiCache in non-cluster mode.
