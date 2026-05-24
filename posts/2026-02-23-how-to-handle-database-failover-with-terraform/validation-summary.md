# Validation Summary: How to Handle Database Failover with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- AWS provider for Terraform (`hashicorp/aws` ~> 5.0)
- Amazon RDS (Multi-AZ)
- Amazon Aurora (aurora-postgresql)
- Amazon Aurora Global Database (cross-region)
- Amazon ElastiCache for Redis
- Amazon DocumentDB
- Amazon CloudWatch (Events / EventBridge, Metric Alarms)
- Amazon SNS
- AWS CLI (rds, elasticache)

## Sources Consulted
- Terraform AWS provider docs: `aws_db_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider docs: `aws_rds_cluster` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider docs: `aws_rds_cluster_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS provider docs: `aws_rds_global_cluster` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_global_cluster
- Terraform AWS provider docs: `aws_elasticache_replication_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider docs: `aws_docdb_cluster` / `aws_docdb_cluster_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster
- Terraform AWS provider docs: `aws_cloudwatch_event_rule` / `aws_cloudwatch_metric_alarm` / `aws_sns_topic_policy`
- AWS docs: Aurora failover and promotion tier — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- AWS docs: RDS Multi-AZ — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- AWS docs: ElastiCache Multi-AZ with automatic failover — https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/AutoFailover.html
- AWS docs: EventBridge event patterns (uses `detail-type` hyphenated key) — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html
- AWS docs: RDS events sent to EventBridge — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html
- AWS CloudWatch metric: `AuroraReplicaLag` (units: milliseconds) — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Monitoring.html
- AWS CLI references: `aws rds reboot-db-instance --force-failover`, `aws rds failover-db-cluster`, `aws elasticache test-failover`

## Issues Found
- **EventBridge event pattern key was incorrect.** The `aws_cloudwatch_event_rule.failover_events` resource used `detail_type` (underscore) inside the `jsonencode` call. EventBridge event-pattern matching requires the hyphenated key `detail-type`; with an underscore the rule would never match any events. Changed `detail_type = [...]` to `"detail-type" = [...]` (quoted because HCL identifiers cannot contain hyphens).

## Review Notes
- All resource attributes and argument names verified against the current `hashicorp/aws` v5 provider.
- Aurora `promotion_tier` range (0 highest, 15 lowest) and tie-breaker behavior (matching instance size) are accurate per AWS documentation.
- RDS Multi-AZ failover typically completes in 60–120 seconds; Aurora failover usually under 60 seconds — the article's estimates are reasonable.
- `AuroraReplicaLag` is reported in milliseconds, so the threshold of 1000 = 1 second is correct.
- The `num_cache_clusters` argument on `aws_elasticache_replication_group` is still supported alongside the newer `num_node_groups` / `replicas_per_node_group` pair; the example's single-shard usage is valid.
- ElastiCache `engine_version = "7.0"` with `parameter_group_name = "default.redis7"` is a valid pairing, though newer Redis versions (7.1) are also available — not an error, just version-specific.
- The AWS CLI failover commands in the "Testing Failover" section are correct and current.
- The SNS topic policy correctly grants `events.amazonaws.com` (EventBridge) permission to publish, which is the right principal for CloudWatch Events / EventBridge targets.
