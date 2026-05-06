# Validation Summary: How to Create CloudWatch Log Groups with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon CloudWatch Logs
- AWS KMS
- AWS Lambda
- Amazon SNS

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `terraform` block syntax: https://opentofu.org/docs/language/settings/
- AWS provider `aws_cloudwatch_log_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- AWS provider `aws_cloudwatch_log_subscription_filter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_subscription_filter
- AWS provider `aws_kms_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- CloudWatch Logs log groups and retention: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html
- CloudWatch Logs KMS encryption: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- CloudWatch Logs metric filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CreateMetricFilterProcedure.html
- CloudWatch Logs metric filter syntax and default values: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntaxForMetricFilters.html
- CloudWatch Logs generic filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- CloudWatch Logs subscription filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- CloudWatch Logs `PutSubscriptionFilter` API: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutSubscriptionFilter.html

## Issues Found
- The Lambda subscription example was missing the required `aws_lambda_permission` resource. CloudWatch Logs must be allowed to invoke the Lambda function before the subscription filter can be created, so I added the permission resource and made the subscription filter depend on it.
- The Lambda subscription example set `distribution = "ByLogStream"` on a Lambda destination. AWS documents `distribution` as applicable only to Amazon Kinesis Data Streams destinations, so I removed it.
- The metric filter comment implied that `default_value = 0` emits a metric even when no logs exist. AWS documents that the default value applies only to periods where logs are ingested but no events match, so I corrected the explanation and set the value explicitly as a string in the example.

## Review Notes
- The post pins `hashicorp/aws` to `~> 5.30`. The examples remain valid, but that constraint is older than the current major release, so future refreshes may want to revisit the version pin deliberately rather than implicitly.
- The KMS example is functionally valid, but AWS now recommends scoping CloudWatch Logs key usage with encryption-context conditions where practical.
