# Validation Summary: How to Create CloudWatch Metric Filters in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon CloudWatch Logs metric filters
- Amazon CloudWatch alarms
- Amazon SNS
- AWS CloudTrail log events
- CloudWatch Logs filter pattern syntax

## Sources Consulted
- AWS CloudWatch Logs User Guide: Creating metrics from log events using filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html
- AWS CloudWatch Logs User Guide: Filter pattern syntax for metric filters, subscription filters, filter log events, and Live Tail: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- AWS CloudTrail User Guide: Creating CloudWatch alarms for CloudTrail events: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cw_create_alarms.html
- AWS Security Hub User Guide: Security Hub CSPM controls for Amazon CloudWatch: https://docs.aws.amazon.com/securityhub/latest/userguide/cloudwatch-controls.html
- Terraform Registry: aws_cloudwatch_log_metric_filter resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter.html
- Terraform Registry: aws_cloudwatch_metric_alarm resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm.html
- OneUptime linked article: https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-anomaly-detection-in-terraform/view

## Issues Found
- The introduction said a metric filter increments a custom metric whenever a match is found. This is accurate for count filters but incomplete for filters that publish an extracted numeric value. Changed the wording to say the filter publishes a custom metric value.
- The simple error-count example said `default_value = "0"` resets the metric to zero when no errors are found. AWS documents that default values are emitted only during periods when logs are ingested but no matching logs are found. Updated the comment to reflect that behavior.
- The unauthorized API CloudTrail example matched exact `UnauthorizedAccess` and `AccessDenied` error codes. AWS/CIS-style guidance uses wildcard matching for `*UnauthorizedOperation` and `AccessDenied*`, which covers the CloudTrail error codes commonly used for unauthorized API activity. Updated the pattern.
- The order value metric extracted `$.orderAmount` but only matched on `$.event = "ORDER_PLACED"`. Updated the pattern to also require `$.orderAmount = *` so the matched event contains the field used as the metric value.
- The best-practices section said `default_value` reports zero during quiet periods and that syntax errors result in no matches rather than errors. AWS documentation distinguishes periods with ingested non-matching logs from periods with no ingestion, and invalid patterns can fail creation. Updated the guidance accordingly.

## Review Notes
- The Terraform resource arguments used in the examples are current for the HashiCorp AWS provider and align with the documented `aws_cloudwatch_log_metric_filter` and `aws_cloudwatch_metric_alarm` schemas.
- Metric filters are supported only for log groups in the CloudWatch Logs Standard log class; the examples do not configure log group class, so they use the default behavior.
