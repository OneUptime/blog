# Validation Summary: How to Configure Cache Failover with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- AWS ElastiCache for Redis OSS replication groups
- Multi-AZ and automatic failover
- Amazon SNS event notifications
- ElastiCache connection endpoints

## Sources Consulted
- Terraform AWS provider documentation for `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- AWS ElastiCache documentation, "Minimizing downtime in ElastiCache by using Multi-AZ with Valkey and Redis OSS": https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoFailover.html
- AWS ElastiCache documentation, "Finding connection endpoints in ElastiCache": https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Endpoints.html
- AWS ElastiCache documentation, "Event Notifications and Amazon SNS": https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ElastiCacheSNS.html
- AWS ElastiCache documentation, "Monitoring use with CloudWatch Metrics": https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.html
- AWS ElastiCache documentation, "Metrics for Valkey and Redis OSS": https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Redis.html
- AWS ElastiCache documentation, "Monitoring CloudWatch Cluster and Node Metrics": https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CloudWatchMetrics.html
- AWS ElastiCache documentation, "Engine versions and upgrading in ElastiCache": https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/engine-versions.html

## Issues Found
- The post used `availability_zones` on `aws_elasticache_replication_group`, but the provider documents `preferred_cache_cluster_azs` for placing cache clusters in specific AZs. I replaced the argument with the correct one.
- The failover-monitoring example used `ReplicationGroupFailoverCount` and `HealthyHostCount` as `AWS/ElastiCache` CloudWatch alarms. AWS documents ElastiCache failover visibility through ElastiCache events/SNS notifications, and ElastiCache metrics are emitted at cache-node level rather than via the shown replication-group alarm pattern. I replaced that section with a documented `notification_topic_arn` example that publishes failover events such as `ElastiCache:FailoverComplete` to SNS.
- The reader endpoint description said it "load-balances" across replicas. AWS documents that the reader endpoint is not a load balancer; it is a DNS record that resolves to replica nodes in round-robin fashion. I corrected that wording and clarified that the primary endpoint continues to resolve to the current primary after failover.
- The conclusion implied that `multi_az_enabled` itself places replicas in other AZs. AWS documents that Multi-AZ requires at least one replica in a different Availability Zone. I updated the conclusion to reflect that and pointed to `preferred_cache_cluster_azs` as one way to make placement explicit.

## Review Notes
- The examples in this post are for cluster mode disabled replication groups, as shown by `num_cache_clusters`. For cluster mode enabled deployments, ElastiCache uses shard-oriented settings such as `num_node_groups` and `replicas_per_node_group`, and clients should use the configuration endpoint instead of primary/reader endpoints.
- AWS documents that ElastiCache SNS event notifications require an SNS topic in the same Region and account, and that the topic cannot be encrypted.
