# Validation Summary: How to Monitor ElastiCache Redis with CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis
- Amazon CloudWatch (metrics, alarms, dashboards, Logs Insights)
- AWS CLI (`aws cloudwatch` commands)
- Terraform (AWS provider: `aws_cloudwatch_metric_alarm`, `aws_cloudwatch_composite_alarm`)
- Python (boto3 CloudWatch client)
- redis-cli

## Sources Consulted
- AWS ElastiCache Redis CloudWatch Metrics documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheMetrics.Redis.html
- AWS ElastiCache Host-Level Metrics: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheMetrics.HostLevel.html
- AWS ElastiCache Log Delivery documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Log_Delivery.html
- AWS CloudWatch ElastiCache namespace reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/elasticache-metricscollected.html
- Terraform Registry: aws_cloudwatch_metric_alarm resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform Registry: aws_cloudwatch_composite_alarm resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_composite_alarm

## Issues Found
- **Incorrect field names in CloudWatch Logs Insights query**: The query used `command` and `execution_time_microseconds` as field names, but the actual ElastiCache slow log JSON format uses `Command` and `Duration (us)`. CloudWatch Logs Insights field names are case-sensitive, and `Duration (us)` requires backtick quoting due to the space and parentheses. Fixed the query to use `Command`, `` `Duration (us)` `` with proper backtick escaping.

## Review Notes
- All 15 ElastiCache Redis CloudWatch metric names referenced in the post are valid and current.
- The namespace `AWS/ElastiCache` and 60-second publish interval are correct per AWS documentation.
- All AWS CLI `put-metric-alarm` commands use correct flags, operators, and dimension formats.
- Terraform resource blocks use valid attribute names and correct syntax for the AWS provider.
- The Python boto3 code uses correct `get_metric_statistics` API parameters. Note that `datetime.utcnow()` is deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`, but it remains functional.
- The `CONFIG SET` commands for `slowlog-log-slower-than` and `slowlog-max-len` are valid Redis commands. Note that these changes are not persistent across node reboots — ElastiCache parameter groups should be used for persistent configuration. The post also does not show how to enable slow log delivery to CloudWatch Logs at the ElastiCache replication group level, which is a separate configuration step.
- The CloudWatch dashboard JSON body structure and composite alarm Terraform syntax are both correct.
