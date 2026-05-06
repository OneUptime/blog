# Validation Summary: How to Configure CloudWatch Log Subscriptions with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS CloudWatch Logs
- AWS Lambda
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- AWS Identity and Access Management (IAM)
- AWS CLI

## Sources Consulted
- AWS CloudWatch Logs API Reference: `PutSubscriptionFilter` - https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutSubscriptionFilter.html
- AWS CloudWatch Logs User Guide: Log group-level subscription filters - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- Amazon Data Firehose Developer Guide: Send CloudWatch Logs to Firehose - https://docs.aws.amazon.com/firehose/latest/dev/writing-with-cloudwatch-logs.html
- AWS CLI Command Reference: `aws logs describe-subscription-filters` - https://docs.aws.amazon.com/cli/latest/reference/logs/describe-subscription-filters.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS Provider: `aws_cloudwatch_log_subscription_filter` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_subscription_filter
- Terraform AWS Provider: `aws_lambda_permission` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS Provider: `aws_cloudwatch_log_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group

## Issues Found
- The Lambda subscription filter example used `distribution = "ByLogStream"`, but `distribution` is only applicable when the destination is an Amazon Kinesis Data Stream. I removed that argument from the Lambda example.
- The Lambda example referenced `aws_iam_role.log_processor` without defining it. I added a Lambda execution role and attached `AWSLambdaBasicExecutionRole` so the example is complete and valid.
- The Kinesis example referenced `data.aws_caller_identity.current.account_id` without declaring the data source. I added `data "aws_caller_identity" "current" {}`.
- The Kinesis and Firehose subscription filter examples did not explicitly depend on the IAM policy resources that grant delivery permissions. I added `depends_on` so the policy is created before the subscription filter is applied.
- The Firehose example reused the Kinesis delivery role and policy, which would not authorize `firehose:PutRecord`. I replaced that with a dedicated Firehose role and policy using the documented `firehose:PutRecord` permission.
- The introduction said CloudWatch Logs subscription filters can use Firehose for direct delivery to OpenSearch. AWS documents that CloudWatch Logs to Firehose does not support an OpenSearch destination for this flow, so I removed that claim.
- The post used the older "Kinesis Firehose" name in technical body text. I updated the body references to the current AWS service name, Amazon Data Firehose.
- The Lambda example used `nodejs20.x`, which AWS marks deprecated as of April 30, 2026. I updated it to `nodejs22.x`, which is currently supported as of May 6, 2026.

## Review Notes
- The Lambda permission example keeps the regional CloudWatch Logs service principal (`logs.${var.region}.amazonaws.com`), which matches the Terraform AWS provider example for `aws_lambda_permission`.
- The IAM trust policies for Kinesis Data Streams and Amazon Data Firehose use `logs.amazonaws.com`, which matches the AWS CloudWatch Logs subscription filter documentation.
