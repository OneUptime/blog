# Validation Summary: How to Configure RDS Monitoring in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS RDS
- Amazon CloudWatch Metrics
- Amazon CloudWatch Alarms
- Amazon CloudWatch Logs
- Amazon CloudWatch Dashboards
- RDS Enhanced Monitoring
- RDS Performance Insights
- CloudWatch Database Insights
- AWS IAM
- Amazon SNS

## Sources Consulted
- AWS RDS User Guide: Monitoring Amazon RDS metrics with Amazon CloudWatch - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/cw-metrics-overview.html
- AWS RDS User Guide: Amazon CloudWatch metrics for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS RDS User Guide: Setting up and enabling Enhanced Monitoring - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- AWS RDS User Guide: Monitoring OS metrics with Enhanced Monitoring - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html
- AWS RDS User Guide: Viewing OS metrics using CloudWatch Logs - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.CloudWatchLogs.html
- AWS RDS User Guide: Overview of Performance Insights on Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html
- AWS RDS User Guide: Pricing and data retention for Performance Insights - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.cost.html
- AWS RDS User Guide: RDS for PostgreSQL database log files - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Concepts.PostgreSQL.html
- AWS RDS User Guide: Publishing MySQL logs to Amazon CloudWatch Logs - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQLDB.PublishtoCloudWatchLogs.html
- AWS RDS User Guide: Publishing MariaDB logs to Amazon CloudWatch Logs - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MariaDB.PublishtoCloudWatchLogs.html
- Amazon CloudWatch User Guide: CloudWatch Database Insights - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Database-Insights.html
- Amazon CloudWatch API Reference: Dashboard body structure and syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Terraform AWS Provider: aws_db_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider: aws_cloudwatch_log_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group

## Issues Found
- The post said it covered every RDS monitoring option. AWS now documents CloudWatch Database Insights as an RDS monitoring option, so this was changed to "the main RDS monitoring options."
- The CloudWatch metrics overview said default RDS metrics are available at 1-minute or 5-minute intervals. AWS documents that RDS sends metric data to CloudWatch in 1-minute periods by default, with some metric-specific exceptions such as CPU credit metrics. The overview was changed to 1-minute intervals.
- The Enhanced Monitoring section listed `/aws/rds/enhanced-monitoring` as the CloudWatch Logs log group. AWS documents the Enhanced Monitoring log group as `RDSOSMetrics`, so the log group name was corrected.
- The Performance Insights section described it as the most powerful RDS monitoring feature and recommended paid 731-day retention without mentioning AWS's announced end of support for the Performance Insights console experience and flexible retention pricing after June 30, 2026. The wording was changed to describe it as query-level monitoring and a caveat was added for CloudWatch Database Insights Advanced mode.
- The "Putting It All Together" and summary wording said "all monitoring" and implied exactly three RDS monitoring layers. This was narrowed to the main monitoring features and typical monitoring layers.

## Review Notes
The Terraform snippets use current AWS provider argument names for RDS Enhanced Monitoring, Performance Insights, CloudWatch log exports, CloudWatch alarms, dashboards, SNS, IAM roles, and log group retention. The examples are illustrative and reference variables and surrounding resources not shown in the post, so they are not standalone Terraform modules.
