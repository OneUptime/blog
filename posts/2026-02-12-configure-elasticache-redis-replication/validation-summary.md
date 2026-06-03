# Validation Summary: How to Configure ElastiCache Redis Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis OSS
- AWS CLI
- Terraform AWS provider
- Amazon CloudWatch metrics and alarms
- Redis OSS replication, cluster mode, Multi-AZ, and automatic failover

## Sources Consulted
- AWS CLI `create-replication-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- AWS CLI `increase-replica-count` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/increase-replica-count.html
- AWS CLI `test-failover` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/test-failover.html
- Amazon ElastiCache replication group and cluster mode documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Replication.html
- Amazon ElastiCache endpoint documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Endpoints.html
- Amazon ElastiCache Multi-AZ automatic failover documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoFailover.html
- Amazon ElastiCache CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CloudWatchMetrics.html
- Amazon ElastiCache Redis OSS parameter group documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ParameterGroups.Engine.html
- Terraform AWS provider `aws_elasticache_replication_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group

## Issues Found
- The replication architecture section described a single primary handling writes and replicating to up to 5 replicas without clarifying cluster mode enabled. Updated it to specify that the limit applies per shard and that cluster mode enabled has a primary and replicas for each shard.
- The automatic failover wording tied replica promotion only to Multi-AZ. Updated it to refer to automatic failover, which is the relevant setting for promotion behavior.
- The cluster mode enabled replica-count section said replicas could be added to specific shards, but the shown command with `--new-replica-count` sets the same replica count across each shard. Updated the text to match the command.
- The failover timing claim said failover typically completes within 15-30 seconds. Current AWS documentation describes Multi-AZ write resumption as usually taking just a few seconds, while recovery time can vary. Updated the wording accordingly.
- The CloudWatch `ReplicationLag` examples only specified `CacheClusterId`. ElastiCache node metrics require both `CacheClusterId` and `CacheNodeId`, so the examples now include `CacheNodeId=0001`.
- The reader endpoint best practice called it load balancing and did not distinguish cluster mode enabled. Updated it to describe reader endpoints as splitting incoming connections for cluster mode disabled, and to recommend the configuration endpoint with a cluster-aware client for cluster mode enabled.

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI documentation. The post still uses the common "ElastiCache Redis" wording; AWS current documentation generally refers to "ElastiCache for Redis OSS" and Valkey separately, but the `redis` engine value and Redis OSS examples remain technically valid.
