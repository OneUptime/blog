# Validation Summary: How to Create RDS with Enhanced Monitoring in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- AWS RDS (PostgreSQL 15, MySQL 8.0)
- AWS Enhanced Monitoring
- AWS CloudWatch (Logs, Metric Filters, Alarms, Dashboards)
- AWS IAM (service-linked monitoring role)
- AWS Performance Insights
- AWS SNS
- HashiCorp AWS provider (`aws_db_instance`, `aws_iam_role`, `aws_cloudwatch_*`)

## Sources Consulted
- AWS RDS Enhanced Monitoring overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html
- AWS RDS Enhanced Monitoring OS metrics reference (swap, memory, cpu, etc. field names and units): https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring-Available-OS-Metrics.html
- Terraform AWS provider `aws_db_instance` resource documentation (for `monitoring_interval`, `monitoring_role_arn`, `performance_insights_enabled`, `performance_insights_retention_period`)
- AWS managed policy `AmazonRDSEnhancedMonitoringRole` ARN (`arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole`)
- RDS Enhanced Monitoring IAM trust principal (`monitoring.rds.amazonaws.com`)

## Issues Found
1. **Non-existent `swap.used` JSON field in the CloudWatch metric filter.** The post extracted `$.swap.used` from the `RDSOSMetrics` log group. Per the AWS Enhanced Monitoring OS metrics reference, the `swap` object only exposes `total`, `in`, `out`, `free`, and `cached` — there is no `used` field. The metric filter would silently fail to publish any value.
   - **Fix:** Changed the filter pattern from `{ $.swap.total > 0 }` to `{ $.swap.cached > 0 }` and the extracted value from `$.swap.used` to `$.swap.cached`. Renamed the resulting CloudWatch metric from `RDSSwapUsage` to `RDSSwapCached` and updated the alarm to reference the new metric name. Added a short clarifying comment about which swap fields exist.

2. **Incorrect threshold units on the swap alarm.** The alarm threshold was `100000000` with a comment saying "100 MB of swap used". Enhanced Monitoring swap metrics are reported in **kilobytes**, so `100000000` would actually be ~95 GB. The original value reflected a bytes assumption that does not match the source data.
   - **Fix:** Changed the threshold to `102400` (100 MB expressed in KB) and updated the inline comment to note the unit.

## Review Notes
- The IAM trust policy (`monitoring.rds.amazonaws.com`) and the managed policy ARN (`arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole`) are both correct for Enhanced Monitoring.
- `monitoring_interval` valid values listed in the comment (`1, 5, 10, 15, 30, 60`) match the Terraform/AWS spec. Value `0` (disabled) is also valid but not relevant to the example.
- `performance_insights_retention_period = 731` is valid (long-term retention tier). The comment "2 years" is correct (731 days ≈ 24 months).
- The `RDSOSMetrics` log group name is shared across all RDS instances in the account; the metric filter as written aggregates swap activity across the entire fleet. This is acceptable for a generic example but readers should be aware that per-instance filtering would require additional pattern selectors (e.g., on `$.instanceID`).
- Standard CloudWatch metric names (`CPUUtilization`, `FreeableMemory`, `ReadIOPS`, `WriteIOPS`, `FreeStorageSpace`, `DatabaseConnections`) and the `AWS/RDS` namespace are all correct.
- Instance classes (`db.r6g.large`, `db.r6g.xlarge`, `db.r6g.2xlarge`), engine versions (`postgres` 15, `mysql` 8.0), and `gp3` storage type are all valid current options.
- The CloudWatch dashboard widget JSON structure (`type`, `x/y/width/height`, `properties.metrics`, `period`, `stat`, `title`) matches the documented dashboard body schema.
