# Validation Summary: How to Create SLA Monitoring Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS Provider (~> 5.0)
- AWS CloudWatch (metric alarms, dashboards, metric math)
- AWS Application Load Balancer (ALB) metrics
- AWS Lambda (Python 3.11)
- AWS EventBridge / CloudWatch Events (scheduled rules)
- AWS SNS
- AWS S3
- AWS IAM

## Sources Consulted
- Terraform AWS provider docs: `aws_cloudwatch_metric_alarm` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm)
- Terraform AWS provider docs: `aws_cloudwatch_dashboard`, `aws_lambda_function`, `aws_cloudwatch_event_rule`, `aws_lambda_permission`
- AWS Application Load Balancer CloudWatch metrics reference (https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html)
- AWS CloudWatch metric math syntax (https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html)
- AWS Lambda supported runtimes (https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
- AWS EventBridge scheduled rule cron expression syntax

## Issues Found
- **Availability calculation in `sla_availability` alarm**: The original example divided `HealthyHostCount` (a target-count metric, typically a small integer like 2-10) by `RequestCount` (total requests, often thousands), then multiplied by 100. This does not produce a meaningful availability percentage and would essentially always be below the 99.9 threshold. Fixed by switching to a request-based availability calculation: `((total - errors) / total) * 100`, using `HTTPCode_Target_5XX_Count` for errors and `RequestCount` for total. The comment was also updated from "percentage of successful health checks" to "percentage of successful requests (non-5xx) against total requests" to match the new math.

## Review Notes
- The error-budget downtime approximation `METRICS("m1") * 5` works (CloudWatch metric math's `METRICS("regex")` matches metric IDs by regex, returning a one-element array which is multiplied by 5 to convert 5-minute periods to minutes). The more idiomatic form is simply `m1 * 5`, but the current expression is valid.
- The downtime approximation treats `UnHealthyHostCount` (Maximum, period=300) as a binary indicator of downtime per 5-minute window. This is a reasonable rough approximation but does not account for partial outages where some but not all targets are unhealthy. For higher fidelity, a fleet-percentage calculation would be better.
- `aws_lambda_function` uses `python3.11` runtime. This is still supported, though Python 3.12 and 3.13 are newer options.
- The AWS provider pin `~> 5.0` is still current and valid (provider v6 has been released but v5 is supported).
- The EventBridge cron expression `cron(0 0 1 * ? *)` correctly fires at 00:00 UTC on the 1st of every month using AWS's 6-field cron format.
- The `events.amazonaws.com` principal in the Lambda permission is the correct service principal for EventBridge / CloudWatch Events to invoke Lambda.
- The dashboard `metrics` array syntax (mixing strings and a render-options object `{ stat = "p95" }`) follows the CloudWatch dashboard JSON schema.
- Availability metric math has a divide-by-zero risk when `RequestCount` is 0 (no traffic). CloudWatch returns missing data in that case; consumers of this pattern should set `treat_missing_data` on the alarm appropriately.
