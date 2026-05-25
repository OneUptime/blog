# Validation Summary: How to Create CloudTrail Trails in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- AWS CloudTrail
- Amazon S3
- AWS KMS
- Amazon CloudWatch Logs
- Amazon CloudWatch metric filters and alarms
- AWS IAM

## Sources Consulted
- AWS CloudTrail User Guide: Amazon S3 bucket policy for CloudTrail - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail User Guide: Configure AWS KMS key policies for CloudTrail - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
- AWS CloudTrail API Reference: EventSelector - https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- AWS CloudTrail API Reference: DataResource - https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- AWS CloudTrail User Guide: Sending events to CloudWatch Logs - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html
- AWS CloudWatch Logs API Reference: LogGroup - https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_LogGroup.html
- Terraform Registry: aws_cloudtrail resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform Registry: aws_cloudwatch_log_group resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- OneUptime linked budget alerts post - https://oneuptime.com/blog/post/2026-02-23-how-to-create-budget-alerts-in-terraform/view

## Issues Found
- The introductory CloudTrail description implied S3 object access is always captured. CloudTrail logs S3 object-level activity as data events only when data event logging is configured, so the wording was corrected.
- The post said the guide covered organization trails, but it does not include organization trail configuration. Removed that claim from the introduction.
- The S3 bucket policy allowed CloudTrail writes only under `AWSLogs/...`, while the main trail examples set `s3_key_prefix = "cloudtrail"`. AWS requires the bucket policy path to match the configured prefix, so the policy was updated to allow both the unprefixed example path and the `cloudtrail/AWSLogs/...` path used by the main trail examples.
- The CloudWatch alarm used `alarm_actions = [var.sns_topic_arn]` while the variable default was an empty string. That can produce an invalid alarm action when no SNS topic is supplied, so the expression now uses an empty list when the variable is blank.

## Review Notes
Terraform CLI was not installed in the workspace, so I could not run `terraform validate`. The snippets were reviewed manually against official AWS and HashiCorp documentation. The KMS and S3 policies are functional examples, but production deployments should further restrict them with conditions such as `aws:SourceArn` where appropriate.
