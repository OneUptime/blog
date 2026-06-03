# Validation Summary: How to Create CloudWatch Log Groups with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudWatch Logs
- AWS CloudWatch metric filters and alarms
- AWS KMS
- AWS Lambda
- Amazon ECS
- Amazon Kinesis Data Streams
- Amazon VPC Flow Logs
- Terraform AWS Provider

## Sources Consulted
- AWS CloudWatch Logs KMS encryption documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- AWS CloudWatch Logs metric filter documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html
- AWS CloudWatch Logs filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- AWS CloudWatch Logs subscription filter documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- AWS Lambda CloudWatch log group documentation: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-loggroups.html
- Amazon ECS awslogs task definition documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon VPC Flow Logs documentation: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html
- Terraform AWS Provider `aws_cloudwatch_log_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform AWS Provider `aws_cloudwatch_log_metric_filter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS Provider `aws_cloudwatch_log_subscription_filter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_subscription_filter
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS Provider `aws_region` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region

## Issues Found
- The introduction implied that VPC Flow Logs always end up in CloudWatch log groups. AWS documents that VPC Flow Logs can publish to CloudWatch Logs, Amazon S3, or Amazon Data Firehose. Updated the wording to specify VPC Flow Logs configured for CloudWatch Logs.
- The KMS example used `data.aws_region.current.name`. Current Terraform AWS Provider documentation deprecates `name` in favor of the region-aware `region` value. Updated the KMS service principal and encryption-context ARN to use `data.aws_region.current.region`.
- The ECS task definition hard-coded `awslogs-region = "us-east-1"` while the log group is created in the provider's configured region. AWS ECS documentation requires the specified log group to exist in the region configured for `awslogs-region`. Updated the snippet to derive the region from `data.aws_region.current.region` and added the data source to that snippet.

## Review Notes
- The remaining Terraform resource names and arguments match current Terraform AWS Provider documentation.
- The CloudWatch Logs metric filter examples use valid text, space-delimited, and JSON filter pattern forms.
- The Lambda subscription filter example correctly omits `role_arn` and uses Lambda resource-based permission for CloudWatch Logs invocation.
