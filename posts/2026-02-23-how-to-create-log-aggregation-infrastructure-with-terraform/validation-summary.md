# Validation Summary: How to Create Log Aggregation Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- AWS provider for Terraform (~> 5.0)
- AWS CloudWatch Logs (log groups, subscription filters, metric filters, alarms)
- AWS S3 (bucket, versioning, lifecycle, public access block)
- AWS Kinesis Data Firehose (extended_s3 destination)
- AWS IAM (roles, role policies)
- AWS SNS (alert topic)

## Sources Consulted
- Terraform AWS Provider: `aws_cloudwatch_log_group` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform AWS Provider: `aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_s3_bucket_lifecycle_configuration`, `aws_s3_bucket_public_access_block` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS Provider: `aws_kinesis_firehose_delivery_stream` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_firehose_delivery_stream
- Terraform AWS Provider: `aws_cloudwatch_log_subscription_filter` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_subscription_filter
- Terraform AWS Provider: `aws_cloudwatch_log_metric_filter`, `aws_cloudwatch_metric_alarm`
- AWS Docs: CloudWatch Logs Subscription Filters with Kinesis Data Firehose — https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- AWS Docs: S3 Lifecycle storage class transitions

## Issues Found
1. **Description/intro inaccurate about Elasticsearch.** Both the post description and the introduction stated the guide would cover "log shipping to Elasticsearch", but no Elasticsearch resources are configured anywhere in the post. The actual pipeline shipped logs via Kinesis Firehose to S3. Updated the description and intro to reference Kinesis Firehose instead of Elasticsearch so the framing matches the content.
2. **Missing IAM permissions policy for the CloudWatch-to-Firehose role.** The post created `aws_iam_role.cloudwatch_to_firehose` with only a trust policy (assume role) and used it as the `role_arn` on the subscription filters. Without an attached permissions policy granting `firehose:PutRecord`/`firehose:PutRecordBatch` on the delivery stream, CloudWatch Logs cannot deliver to Firehose and log records would silently fail. Added a parallel `aws_iam_role_policy.cloudwatch_to_firehose` resource granting these actions on `aws_kinesis_firehose_delivery_stream.log_delivery.arn`, matching the pattern already used for the Firehose-to-S3 role earlier in the post.

## Review Notes
- The standalone `aws_s3_bucket` resource with separate `aws_s3_bucket_versioning`, `aws_s3_bucket_lifecycle_configuration`, and `aws_s3_bucket_public_access_block` resources is the correct pattern for AWS provider 5.x — inline bucket arguments are deprecated.
- `buffering_size = 64` (MB) and `buffering_interval = 300` (seconds) are within the valid Firehose ranges (size 1–128 MB, interval 0–900 s). `compression_format = "GZIP"` is a valid option.
- The `!{timestamp:yyyy}` / `!{firehose:error-output-type}` prefix syntax is the correct Firehose dynamic-partitioning placeholder format.
- `STANDARD_IA` and `GLACIER` are both valid S3 storage classes for lifecycle transitions; the lifecycle rule structure (transition + expiration blocks inside a rule with id/status) is correct.
- The CloudWatch Logs service principal `logs.${var.aws_region}.amazonaws.com` (regionalized) used in the trust policy is the form shown in many AWS examples for this use case and is accepted; AWS more recently also documents the non-regionalized `logs.amazonaws.com` with a `SourceArn` condition for confused-deputy protection. Either works — left as-is.
- The post does not configure server-side encryption (KMS) on the log S3 bucket or the CloudWatch log groups, despite the best-practices section recommending it. That's a content gap rather than a technical error in the code shown, so it was not modified.
- The Firehose-to-S3 IAM policy grants `s3:PutObject`, `s3:GetBucketLocation`, and `s3:ListBucket`. For a fully production-ready setup, KMS-related actions and additional Firehose logging actions (CloudWatch error logging) are commonly added; the minimal set shown is sufficient for the described pipeline.
