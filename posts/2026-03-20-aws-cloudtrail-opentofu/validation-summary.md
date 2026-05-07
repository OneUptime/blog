# Validation Summary: How to Set Up AWS CloudTrail with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CloudTrail
- Amazon S3
- AWS KMS
- Amazon CloudWatch Logs
- Amazon CloudWatch Alarms
- Amazon SNS
- IAM

## Sources Consulted
- AWS CloudTrail, Amazon S3 bucket policy for CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail, Configure AWS KMS key policies for CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
- AWS CloudTrail, Default KMS key policy created in CloudTrail console: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/default-kms-key-policy.html
- AWS CloudTrail, Sending events to CloudWatch Logs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html
- AWS CloudTrail, Role policy document for CloudTrail to use CloudWatch Logs for monitoring: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-required-policy-for-cloudwatch-logs.html
- AWS CloudTrail API Reference, `DataResource`: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- AWS CLI Command Reference, `cloudtrail put-event-selectors`: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/put-event-selectors.html
- Amazon CloudWatch Logs, Encrypt log data in CloudWatch Logs using AWS KMS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- AWS Security Hub CSPM controls for Amazon CloudWatch: https://docs.aws.amazon.com/securityhub/latest/userguide/cloudwatch-controls.html
- HashiCorp AWS provider docs source for `aws_cloudtrail`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudtrail.html.markdown
- HashiCorp AWS provider docs source for `aws_cloudwatch_log_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_group.html.markdown
- HashiCorp AWS provider docs source for `aws_cloudwatch_log_metric_filter`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_metric_filter.html.markdown

## Issues Found
- The KMS key example created a key but omitted the key policy statements CloudTrail needs for SSE-KMS and the regional CloudWatch Logs service needs for log-group encryption. I added an explicit `aws_iam_policy_document` and attached it to the key so the trail and log group can actually use the key.
- The trail referenced `aws_iam_role.cloudtrail_cw.arn`, but the post did not define that IAM role or its permissions. I added the assume-role policy, the IAM role, and an inline policy granting `logs:CreateLogStream` and `logs:PutLogEvents`, and made the trail depend on that policy.
- The S3 object data-event selector used `arn:aws:s3:::`. AWS documents `arn:aws:s3` as the correct value for logging data events for all objects in all S3 buckets in the account. I changed the selector to `arn:aws:s3`.
- The root-account alarm pointed at a metric that the post never created, and its SNS topic reference was also undefined. I added an SNS topic plus a CloudWatch Logs metric filter that emits `RootAccountUsageEventCount` using AWS’s documented root-user detection pattern, then kept the alarm pointed at that emitted metric.

## Review Notes
- The S3 bucket policy is functionally correct for CloudTrail delivery, but AWS recommends adding an `aws:SourceArn` condition as an additional hardening step.
- Logging S3 object data events for all buckets with `arn:aws:s3` is valid, but it can materially increase CloudTrail costs compared with management-events-only trails.
