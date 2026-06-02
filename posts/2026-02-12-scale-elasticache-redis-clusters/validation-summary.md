# Validation Summary: How to Scale ElastiCache Redis Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS ElastiCache for Redis OSS
- AWS CLI
- Amazon CloudWatch metrics
- Application Auto Scaling
- Terraform AWS provider

## Sources Consulted
- AWS CLI `modify-replication-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/modify-replication-group.html
- AWS CLI `modify-replication-group-shard-configuration` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/modify-replication-group-shard-configuration.html
- AWS CLI `increase-replica-count` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/increase-replica-count.html
- Amazon ElastiCache online vertical scaling documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/redis-cluster-vertical-scaling.html
- Amazon ElastiCache scaling replica nodes documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Scaling.RedisReplGrps.html
- Amazon ElastiCache CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.WhichShouldIMonitor.html
- Amazon ElastiCache Valkey and Redis OSS metrics documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Redis.html
- Application Auto Scaling integration for ElastiCache: https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-elasticache.html
- Amazon ElastiCache auto scaling policy documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoScaling-Scaling-Defining-Policy-API.html
- Terraform AWS provider `aws_elasticache_replication_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Amazon ElastiCache engine-specific parameter groups: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ParameterGroups.Engine.html

## Issues Found
- The vertical scaling section said the operation causes a brief outage during failover. Current ElastiCache documentation describes online vertical scaling with minimal downtime for supported Redis OSS versions, with possible brief interruption depending on version and failover configuration. I updated the wording to reflect online scaling and avoid promising a specific failover outage pattern.
- The "Resharding with Specific Slot Distribution" section used `--resharding-configuration`, but that AWS CLI option specifies preferred Availability Zones for node groups, not hash slot ranges. I renamed the section and comments to describe Availability Zone placement.
- The Terraform cluster-mode example omitted a cluster-enabled Redis parameter group. The Terraform provider documentation notes that cluster mode/data sharding should use a parameter group with `cluster-enabled` set to true. I added `parameter_group_name = "default.redis7.cluster.on"` for the Redis 7.0 example.

## Review Notes
- The AWS CLI was not installed in the local workspace, so command validation was performed against official AWS CLI documentation instead of local `aws --help` output.
- The post uses "Redis" terminology throughout. AWS current documentation increasingly says "Redis OSS" and also supports Valkey; this is not technically incorrect for the Redis-focused post, but future updates may want to mention Valkey where applicable.
