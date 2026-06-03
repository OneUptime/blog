# Validation Summary: How to Create CloudWatch Alarms with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudWatch alarms
- AWS CloudWatch composite alarms
- AWS CloudWatch anomaly detection
- AWS SNS topics and email subscriptions
- AWS EC2 CloudWatch metrics
- AWS RDS CloudWatch metrics
- AWS Application Load Balancer CloudWatch metrics
- Terraform AWS provider
- Terraform `for_each` meta-argument

## Sources Consulted
- Terraform AWS provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm.html
- Terraform AWS provider documentation for `aws_cloudwatch_composite_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_composite_alarm
- Terraform AWS provider documentation for `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- AWS CloudWatch documentation on missing alarm data: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- AWS CloudWatch documentation on composite alarms: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- AWS CloudWatch `PutMetricAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- AWS EC2 CloudWatch metrics documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- AWS RDS CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html

## Issues Found
- The introduction said a CloudWatch alarm watches a single metric, but the post later covers metric math and composite alarms. Changed the wording to "a basic CloudWatch metric alarm" to keep the statement accurate.
- The SNS email subscription example did not mention that email endpoints must confirm the subscription before receiving notifications. Added a short note after the Terraform snippet.
- The EC2 CPU alarm introduction said the alarm fires after 5 minutes, but the code uses `evaluation_periods = 2` and `period = 300`, which requires two 5-minute periods. Changed the prose to 10 minutes.
- The ALB missing-data explanation said alarms would fire during low-traffic periods. With the default `missing` behavior, all missing datapoints can transition the alarm to `INSUFFICIENT_DATA`, not directly to `ALARM`. Updated the text accordingly.
- The composite alarm prose said it combined CPU and memory alarms, but the code combines EC2 CPU and RDS CPU alarms. Updated the prose to match the code.
- The section titled "Using Dynamic Blocks for Multiple Instances" used Terraform `for_each`, not dynamic blocks. Renamed it to "Using for_each for Multiple Instances."
- The anomaly detection Terraform example set `return_data = true` on both the anomaly band expression and the raw metric query. The Terraform AWS provider documentation specifies exactly one `metric_query` should return data for the alarm. Changed the raw metric query to `return_data = false`.

## Review Notes
Terraform is not installed in the workspace, so I could not run `terraform fmt` or provider-level validation locally. The HCL snippets were reviewed manually against the current Terraform AWS provider documentation and AWS service documentation.
