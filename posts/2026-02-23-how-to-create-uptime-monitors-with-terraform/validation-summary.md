# Validation Summary: How to Create Uptime Monitors with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS CloudWatch Synthetics
- AWS CloudWatch Metric Alarms
- AWS SNS
- AWS Lambda
- AWS EventBridge (CloudWatch Events)
- AWS IAM
- AWS S3
- GCP Cloud Monitoring (uptime checks, alert policies, notification channels)

## Sources Consulted
- Terraform AWS Provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
  - `aws_cloudwatch_metric_alarm`, `aws_iam_role`, `aws_lambda_function`, `aws_lambda_permission`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, `aws_sns_topic`, `aws_s3_bucket`
- Terraform Google Provider docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs
  - `google_monitoring_uptime_check_config`, `google_monitoring_alert_policy`, `google_monitoring_notification_channel`
- AWS CloudWatch Synthetics docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html
  - Verified metric `SuccessPercent` in namespace `CloudWatchSynthetics`
  - Verified canary IAM role trust principal `lambda.amazonaws.com`
  - Verified managed policy `CloudWatchSyntheticsFullAccess`
- GCP Monitoring Uptime Checks docs: https://cloud.google.com/monitoring/uptime-checks
  - Verified valid `period` values (60s, 300s, 600s, 900s) and `timeout` range (1-60s)
  - Verified `selected_regions` enum (USA, EUROPE, SOUTH_AMERICA, ASIA_PACIFIC)
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html (verified python3.11)
- AWS EventBridge principal documentation (verified `events.amazonaws.com`)

## Issues Found
No technical issues found.

## Review Notes
- The post focuses on alarms and supporting infrastructure but does not define the actual `aws_synthetics_canary` resource that the CloudWatch metric alarms reference via the `CanaryName` dimension. The alarms would have no data to evaluate until canaries are created separately. This is a structural/completeness consideration rather than a technical error in the shown code, but readers should be aware they need to provision canary resources (or use the custom Lambda alternative shown later) to produce the metrics being alarmed on.
- The GCP `http_check.path` calculation uses a nested `replace`/`split` expression that works correctly for the example URLs, but is fragile for URLs containing query strings or non-`https://` schemes. For more complex URL handling, `regex()` would be more robust.
- The GCP alert policy uses the standard pattern of `REDUCE_COUNT_FALSE` with `COMPARISON_GT` and `threshold_value = 1` to detect failed uptime checks, which is the canonical approach documented by Google Cloud.
- The S3 bucket created for canary artifacts does not include public access block, ownership controls, or encryption configuration. These are best-practice security additions but not technical errors in the shown code.
- AWS provider `~> 5.0` and Google provider `~> 5.0` are current generally-available major versions at the time of review.
