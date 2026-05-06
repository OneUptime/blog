# Validation Summary: How to Create a CloudWatch Alarm with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CloudWatch
- AWS SNS
- Amazon EC2
- AWS Lambda
- Amazon RDS
- HCL / AWS provider configuration

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu CLI overview: https://opentofu.org/docs/cli/commands/
- OpenTofu `init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/cli/commands/apply/
- Amazon CloudWatch alarms overview: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Alarms.html
- Amazon CloudWatch alarm actions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html
- Amazon CloudWatch `PutMetricAlarm` API: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- Amazon CloudWatch `MetricDataQuery` API: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDataQuery.html
- Amazon CloudWatch composite alarms: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- AWS Lambda metrics reference: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon RDS CloudWatch metrics reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS provider `aws_cloudwatch_metric_alarm` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS provider `aws_cloudwatch_composite_alarm` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_composite_alarm.html.markdown

## Issues Found
- The description said the post covered custom metrics, but the actual examples cover EC2, Lambda, and RDS metrics. I updated the description to match the content.
- In the Lambda metric-math alarm, the supporting `errors` and `invocations` queries did not explicitly set `return_data = false`. I added those fields so the example matches CloudWatch `MetricDataQuery` guidance and the AWS provider documentation that only the alarm expression should return data.
- The composite alarm comment said the alarm fired when CPU and memory were high, but the actual rule combined the EC2 CPU alarm and the RDS `FreeStorageSpace` alarm. I corrected the comment to match the code.
- The conclusion overstated composite alarm behavior. I updated it to clarify that alert-fatigue reduction depends on configuring notifications at the composite alarm level, and that `ok_actions` are needed when recovery notifications are desired.

## Review Notes
- The OpenTofu syntax in the post is valid: OpenTofu still uses the `terraform` block for `required_providers`, and `tofu init`, `tofu plan`, and `tofu apply` remain the correct workflow commands.
- The AWS provider resource arguments used in the post are still documented in the current provider docs, including `metric_query`, `treat_missing_data`, and `alarm_rule`.
