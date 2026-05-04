# Validation Summary: How to Create ElastiCache Replication Groups with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS ElastiCache for Redis
- `aws_elasticache_replication_group` (hashicorp/aws provider)
- `aws_elasticache_global_replication_group` (hashicorp/aws provider)
- AWS CloudWatch metrics (`AWS/ElastiCache` namespace)
- AWS SNS (referenced via `aws_sns_topic.alerts`)

## Sources Consulted
- Terraform AWS Provider — `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS Provider — `aws_elasticache_global_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_global_replication_group
- AWS ElastiCache for Redis CloudWatch metrics: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheMetrics.Redis.html
- AWS ElastiCache CloudWatch dimensions guidance: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheMetrics.WhichShouldIMonitor.html

## Issues Found
- **`availability_zones` is not a valid argument on `aws_elasticache_replication_group`.** The correct argument name in the hashicorp/aws provider is `preferred_cache_cluster_azs`. Fixed in the "Replication Group with Preferred AZs" example by replacing `availability_zones = [...]` with `preferred_cache_cluster_azs = [...]`.

## Review Notes
- The `description` argument (rather than the older `replication_group_description`) is correctly used throughout — this matches the current provider schema.
- Engine version `7.1`, node type `cache.r7g.large`, and port `6379` are all valid current Redis OSS / ElastiCache values.
- The `ReplicationLag` CloudWatch metric is most commonly emitted at the per-replica node level (dimension `CacheClusterId`). The post uses `ReplicationGroupId` for a group-level rollup, which is supported but is a coarser-grained signal; for more actionable per-replica alerting, alarming on `CacheClusterId` per replica is generally preferred. Left as written since `ReplicationGroupId` is a valid dimension for group-level rollups.
- Secondary replication group in the global datastore correctly omits `engine_version` and `node_type` — these are inherited from the global replication group's primary, as required by AWS.
