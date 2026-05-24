# Validation Summary: How to Create ElastiCache with Replication Groups in Terraform

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Terraform (HCL)
- AWS ElastiCache (Redis)
- AWS VPC, Subnets, Security Groups
- AWS CloudWatch (metric alarms)
- AWS SNS (notification topics)
- Redis 7.0
- Terraform AWS Provider (~> 5.0)

## Sources Consulted
- Terraform AWS Provider documentation for `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS Provider source docs on GitHub: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/elasticache_replication_group.html.markdown
- AWS ElastiCache documentation on replication groups, Multi-AZ, data tiering, and supported node types
- AWS CloudWatch metrics for ElastiCache (`ReplicationLag`, `DatabaseMemoryUsagePercentage`)
- Redis configuration documentation (`maxmemory-policy`, `notify-keyspace-events`)

## Issues Found
No technical issues found.

All Terraform attributes used in the post (`description`, `num_cache_clusters`, `automatic_failover_enabled`, `multi_az_enabled`, `at_rest_encryption_enabled`, `transit_encryption_enabled`, `auth_token`, `data_tiering_enabled`, `preferred_cache_cluster_azs`, `snapshot_window`, `snapshot_retention_limit`, `maintenance_window`, `auto_minor_version_upgrade`, `notification_topic_arn`, `primary_endpoint_address`, `reader_endpoint_address`) are valid in AWS provider v5.x. The `description` argument is correct for provider v5.x (it replaced the older `replication_group_description` from v4.x).

Verified technical claims:
- Non-cluster-mode Redis replication groups support 1 primary + up to 5 replicas (6 nodes max) — correct.
- Data tiering requires r6gd node types (minimum r6gd.xlarge) — correct.
- Parameter group family `redis7` is valid for Redis 7.x — correct.
- CloudWatch metrics `ReplicationLag` (reported in seconds) and `DatabaseMemoryUsagePercentage` under namespace `AWS/ElastiCache` — correct.
- Redis parameters `maxmemory-policy = "volatile-lru"` and `notify-keyspace-events = "Ex"` (keyevent expired events) — correct.
- `auth_token` requires `transit_encryption_enabled = true` — correctly stated.

## Review Notes
- The post uses `num_cache_clusters` for non-cluster-mode replication groups, which is the correct attribute. For cluster-mode-enabled deployments (outside this post's scope), `num_node_groups` and `replicas_per_node_group` would be used instead.
- The `engine_version = "7.0"` is acceptable; AWS will use the latest 7.0.x patch version. Pinning to a specific minor (e.g., `7.1`) may be worth considering for newer features but is not technically incorrect here.
- Scaling `num_cache_clusters` triggers an in-place modification — generally safe but may cause brief failover events; this nuance is not explicitly called out but doesn't affect correctness.
- The `engine = "redis"` value is valid; recent provider versions also support `valkey`, but `redis` remains correct.
