# Validation Summary: How to Create ElastiCache with Cluster Mode in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp AWS provider ~> 5.0)
- AWS ElastiCache for Redis (cluster mode enabled)
- Redis 7.0
- AWS VPC, Subnets, Security Groups
- AWS Application Auto Scaling
- AWS CloudWatch alarms
- AWS SNS

## Sources Consulted
- Terraform AWS provider: `aws_elasticache_replication_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider: `aws_elasticache_parameter_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_parameter_group
- Terraform AWS provider: `aws_appautoscaling_target` / `aws_appautoscaling_policy`
- AWS docs: ElastiCache Parameter Groups — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ParameterGroups.Management.html
- AWS docs: ElastiCache Auto Scaling Predefined Metrics — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoScaling-Predefined.html
- AWS docs: ElastiCache CloudWatch Metrics — https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.WhichShouldIMonitor.html
- AWS docs: Redis Cluster specification (16,384 hash slots) — https://redis.io/docs/management/scaling/
- Terraform AWS provider issue #22903 (removal of `replication_group_description` in v5)

## Issues Found
- **Auto scaling predefined metric mismatch (fixed).** The `aws_appautoscaling_policy` used `predefined_metric_type = "ElastiCachePrimaryEngineCPUUtilization"` with `scalable_dimension = "elasticache:replication-group:Replicas"`. Per AWS docs, the conventional and intended pairing is `ElastiCacheReplicaEngineCPUUtilization` with the Replicas dimension (`ElastiCachePrimaryEngineCPUUtilization` is paired with the `NodeGroups`/shards dimension). Changed to `ElastiCacheReplicaEngineCPUUtilization` and updated the inline comment accordingly.

## Review Notes
- The `aws_elasticache_parameter_group` block uses `family = "redis7"` and explicitly sets `cluster-enabled = "yes"`. This is correct: `redis7.cluster.on` is the name of the AWS-managed default parameter group (`default.redis7.cluster.on`), not a `family` value. For a custom parameter group, the right pattern is `family = "redis7"` plus setting `cluster-enabled = "yes"` (modifiable only while the parameter group is not yet attached to a cluster).
- `description` (rather than `replication_group_description`) is the correct attribute on `aws_elasticache_replication_group` in provider v5.x.
- `engine_version = "7.0"` is valid; newer 7.x versions (e.g., `7.1`) also exist. Specifying `7.0` keeps the example pinned and reproducible.
- `replicas_per_node_group = 2` is valid (range 0–5).
- `automatic_failover_enabled = true` is correctly noted as required for cluster mode.
- `EngineCPUUtilization` is the recommended CloudWatch metric for multi-vCPU nodes (single-threaded Redis engine); the older `CPUUtilization` is still valid but better suited to small (≤2 vCPU) node types.
- `auth_token` defaults to `null` via the variable; this means no AUTH unless the variable is supplied. Since `transit_encryption_enabled = true`, supplying an auth_token would be supported.
- Hash slot count (16,384), max five replicas per shard, hash-tag requirement for multi-key operations, and the `KEYS`/`SCAN` per-shard caveat are all accurate.
- Online resharding statement is consistent with AWS docs (minimal/zero-downtime resharding for cluster mode enabled).
