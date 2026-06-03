# Validation Summary: How to Enable RDS Enhanced Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- RDS Enhanced Monitoring
- Amazon CloudWatch Logs
- Amazon CloudWatch custom metrics
- AWS IAM
- AWS CLI
- Python
- boto3
- AWS Lambda

## Sources Consulted
- Amazon RDS User Guide: Setting up and enabling Enhanced Monitoring - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- Amazon RDS User Guide: Viewing OS metrics using CloudWatch Logs - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.CloudWatchLogs.html
- Amazon RDS User Guide: OS metrics in Enhanced Monitoring - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring-Available-OS-Metrics.html
- Amazon RDS User Guide: Monitoring Amazon RDS metrics with Amazon CloudWatch - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/monitoring-cloudwatch.html
- AWS CLI Command Reference: create-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS Managed Policy Reference: AmazonRDSEnhancedMonitoringRole - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonRDSEnhancedMonitoringRole.html
- Amazon CloudWatch Logs User Guide: Log group-level subscription filters - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html

## Issues Found
- The post used `/aws/rds/enhanced-monitoring` as the Enhanced Monitoring log group. AWS documents the log group as `RDSOSMetrics`, so the explanatory text and `get_log_events` example were updated.
- The Lambda example assumed an `event['Records']` payload with `record['body']`, which is not the CloudWatch Logs subscription payload shape. Updated it to decode `event['awslogs']['data']` from base64 and gzip, then iterate through `logEvents`.
- The Linux process list JSON example used `pid`. RDS Enhanced Monitoring documents `id` for Db2, MariaDB, MySQL, Oracle, and PostgreSQL process identifiers, so the example was updated to use `id`.
- The prerequisite section omitted the `iam:PassRole` permission required by the IAM identity enabling Enhanced Monitoring via AWS CLI or API. Added a short note.
- The Python read example used `datetime.utcnow()`, which is deprecated in current Python. Updated it to use timezone-aware UTC timestamps.

## Review Notes
Cost estimates are region-dependent and can change with CloudWatch Logs pricing, but the post correctly frames Enhanced Monitoring cost as CloudWatch Logs ingestion and storage. The sample `create-db-instance` command is intentionally minimal; real deployments usually need additional networking, backup, encryption, and security options.
