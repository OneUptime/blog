# Validation Summary: How to Configure ElastiCache Redis Data Tiering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis OSS
- ElastiCache data tiering
- AWS CLI
- Amazon CloudWatch metrics and alarms
- Python redis client

## Sources Consulted
- Amazon ElastiCache User Guide: Data tiering in ElastiCache - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/data-tiering.html
- Amazon ElastiCache User Guide: Metrics for Valkey and Redis OSS - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Redis.html
- Amazon ElastiCache User Guide: Supported node types - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.SupportedTypes.html
- Amazon ElastiCache User Guide: Engine versions and upgrading in ElastiCache - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/engine-versions.html
- Amazon ElastiCache User Guide: Engine specific parameters - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ParameterGroups.Engine.html
- AWS CLI Command Reference: create-replication-group - https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- AWS CLI Command Reference: create-cache-parameter-group - https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-cache-parameter-group.html
- AWS CLI Command Reference: get-metric-statistics - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html

## Issues Found
- The post claimed data tiering stores up to 20 times more data per node. AWS documents r6gd nodes as providing 4.8 times more total capacity than comparable r6g nodes, so the description, introduction, cost example, and summary were corrected.
- The r6gd.4xlarge example claimed 105 GB DRAM plus 1 TB SSD. This was corrected to 105 GB DRAM plus roughly 400 GB SSD, consistent with the documented 4.8x total capacity ratio.
- The post described Redis as managing tier movement. AWS documents ElastiCache as monitoring item access times and moving less-recently-used values, so the wording was corrected.
- The cost example used fixed monthly prices and a 71% savings claim. Because pricing varies by Region and changes over time, this was changed to a node-hour comparison and AWS's documented over-60% savings statement at maximum utilization.
- The `DataTieringDiskUsagePercentage` CloudWatch metric is not documented for ElastiCache Redis OSS. The monitoring examples were changed to use `BytesUsedForCache` with `Tier=Memory` and `Tier=SSD`, and the capacity alarm now uses `DatabaseCapacityUsagePercentage`.
- The latency `get-metric-statistics` example used `--statistics p99`, but CloudWatch percentiles must use `--extended-statistics`. The command was corrected.
- The latency alarm threshold was `5` even though ElastiCache command latency metrics are in microseconds. It was changed to `5000` to represent 5 ms.
- The post stated that cluster mode must be enabled. AWS documents that data tiering requires a replication group and r6gd node type, but cluster mode does not have to be enabled. The limitation and example shard count were corrected.
- The maxmemory-policy explanation overstated that `allkeys-lru` keeps hot data in DRAM. It was corrected to state that `allkeys-lru` is a supported eviction policy for cache workloads when total data capacity is full.

## Review Notes
The Python snippets are syntactically valid illustrative examples, but they assume a configured `redis` package, a reachable TLS-enabled ElastiCache endpoint, and an application-provided `database` object in the product catalog example. The AWS CLI was not installed in the local workspace, so command verification was performed against official AWS CLI and ElastiCache documentation.
