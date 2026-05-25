# Validation Summary: How to Create Database Monitoring Dashboards with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon CloudWatch dashboards
- Amazon CloudWatch metric alarms
- Amazon RDS
- Amazon Aurora
- Amazon ElastiCache for Redis OSS
- Amazon DynamoDB
- Amazon SNS

## Sources Consulted
- Terraform Registry: `aws_cloudwatch_dashboard` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- Terraform Registry: `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Amazon CloudWatch dashboard body structure and metric widget syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Amazon RDS CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon Aurora CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- Amazon ElastiCache CloudWatch metrics: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CloudWatchMetrics.html
- Amazon ElastiCache metrics for Valkey and Redis OSS: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Redis.html
- Amazon DynamoDB metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html

## Issues Found
- The ElastiCache Redis dashboard used `ReplicationGroupId` as the only CloudWatch metric dimension. AWS documents ElastiCache node metrics under `CacheClusterId` and `CacheNodeId`, so the example was updated to accept a list of Redis cache nodes and use both required dimensions for each metric.
- The Aurora dashboard used `DBClusterIdentifier` for `BufferCacheHitRatio` and `Deadlocks`. These are documented as Aurora instance-level metrics, so the example was updated to graph them by `DBInstanceIdentifier` using the existing `aurora_instance_ids` variable.
- The DynamoDB dashboard used only `TableName` for `SystemErrors`. AWS documents `SystemErrors` with `TableName` and `Operation` dimensions, so the example was updated to include `GetItem`, `PutItem`, and `Query` operation series.

## Review Notes
The Terraform examples use current `aws_cloudwatch_dashboard` and `aws_cloudwatch_metric_alarm` resource arguments and valid CloudWatch dashboard metric widget structure. Terraform was not installed in the local environment, so `terraform validate` could not be run.
