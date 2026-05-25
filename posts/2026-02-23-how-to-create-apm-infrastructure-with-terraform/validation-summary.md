# Validation Summary: How to Create APM Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon CloudWatch metrics, metric alarms, dashboards, metric math, and anomaly detection
- Amazon SNS topics and subscriptions
- AWS Lambda permissions for SNS invocation

## Sources Consulted
- Terraform AWS provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider documentation for `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider documentation for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform `jsonencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Amazon CloudWatch metric math documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html
- Amazon CloudWatch statistics definitions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Statistics-definitions.html
- Amazon CloudWatch dashboard body structure documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Amazon CloudWatch `PutMetricAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- Amazon CloudWatch anomaly detection documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html
- AWS Lambda documentation for SNS triggers: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- Referenced OneUptime distributed tracing post: https://oneuptime.com/blog/post/2026-02-23-how-to-create-distributed-tracing-infrastructure-with-terraform/view
- Referenced OneUptime alerting pipelines post: https://oneuptime.com/blog/post/2026-02-23-how-to-create-alerting-pipelines-with-terraform/view

## Issues Found
- The latency alarm used `PERCENTILE(m1, 99)` as a CloudWatch metric math expression. CloudWatch percentiles are CloudWatch statistics such as `p99`, not a `PERCENTILE` metric math function. Changed the alarm to use `extended_statistic = "p99"` directly on the `ResponseTime` metric.
- The section heading and lead-in said the snippet created custom metric namespaces and resource utilization alarms, but the Terraform only defines alarms over custom metrics that must already be published. Changed the wording to "Using Custom Metric Namespaces and Alarms" and limited the description to latency and error rate.
- The anomaly detection alarm set `return_data = true` on both the underlying metric and the anomaly detection band expression. AWS `PutMetricAlarm` examples for anomaly detection return the watched metric data and use `threshold_metric_id` for the band. Removed `return_data = true` from the `ANOMALY_DETECTION_BAND` expression.
- The Lambda SNS subscription did not grant SNS permission to invoke the Lambda function. Added an `aws_lambda_permission` resource with `principal = "sns.amazonaws.com"` and `source_arn` set to the SNS topic ARN, then made the subscription depend on that permission.

## Review Notes
- Terraform CLI was not installed in the workspace, so I could not run `terraform validate`. I parsed all six HCL code blocks with the local Python HCL parser successfully.
- The post assumes the application publishes custom `ResponseTime`, `ErrorCount`, and `RequestCount` metrics into the `APM/${var.environment}` namespace; Terraform does not create metric data by itself.
