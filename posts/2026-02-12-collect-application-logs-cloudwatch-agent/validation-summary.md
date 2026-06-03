# Validation Summary: How to Collect Application Logs with CloudWatch Agent

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Agent
- Amazon CloudWatch Logs
- Amazon EC2
- IAM policies for CloudWatch Logs
- JSON configuration
- Log collection, filtering, timestamp parsing, and multi-line log handling

## Sources Consulted
- AWS CloudWatch Agent configuration file details: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS CloudWatch Agent troubleshooting guide: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/troubleshooting-CloudWatch-Agent.html
- AWS CloudWatch Agent common scenarios: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-common-scenarios.html
- AWS managed policy reference for CloudWatchAgentServerPolicy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
- AWS Service Authorization Reference for Amazon CloudWatch Logs: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html

## Issues Found
- Corrected the `retention_in_days` description. AWS documents that the agent can update retention for existing log groups, not only set retention when a group is created.
- Corrected wildcard guidance. AWS documents that when a wildcard matches multiple files, only the latest matching file is pushed based on modification time, so wildcards should be used for rotated files of the same type rather than unrelated log files.
- Corrected the explanation of default multi-line behavior. AWS documents that when `multi_line_start_pattern` is omitted, multi-line mode is disabled and non-whitespace-starting lines begin new log events.
- Corrected timestamp guidance for literal `Z` UTC timestamps and removed the unsupported `%s` epoch-seconds example. AWS's documented CloudWatch Agent timestamp symbols include `%z` for offsets such as `-0700`, but not `%s`.
- Corrected the custom IAM policy example. `logs:CreateLogStream` and `logs:PutLogEvents` require log-stream resources, while retention and stream description use log-group resources; `logs:DescribeLogGroups` is left on `*`.
- Corrected troubleshooting wording for delivery delay. Lowering `force_flush_interval` increases flush frequency; the original text said to increase it.

## Review Notes
The JSON configuration snippets were checked for syntax after edits. The post is technically relevant and remains a valid CloudWatch Agent log collection guide.
