# Validation Summary: How to Use Dynamic Blocks for CloudWatch Metric Alarms

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- Terraform `for_each` and `for` expressions
- AWS CloudWatch metric alarms
- AWS CloudWatch metric math and anomaly detection
- AWS CloudWatch dashboards

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider `aws_cloudwatch_dashboard` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- Amazon CloudWatch anomaly detection documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html
- Amazon CloudWatch `PutMetricAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html

## Issues Found
- The post described metric math alarms as "composite alarms." CloudWatch composite alarms are a separate alarm type/resource, while the example uses `aws_cloudwatch_metric_alarm` with `metric_query` blocks. Updated the section title, wording, variable name, resource name, and example input name to use "metric math alarms."
- The anomaly detection example used `threshold = 2` as though the static threshold argument represented the anomaly detection standard deviation. In the AWS provider, anomaly detection alarms should use `threshold_metric_id` matching the `ANOMALY_DETECTION_BAND` metric query ID, and the standard deviation value belongs in the metric math expression. Updated the variable schema, resource arguments, and example to use `threshold_metric_id = "anomaly_band"` with `ANOMALY_DETECTION_BAND(m1, 2)`.
- The dashboard section said it used dynamic blocks, but the example uses `jsonencode` with a Terraform `for` expression. Updated the section heading and introductory sentence to describe the actual Terraform construct.

## Review Notes
- Terraform was not installed in the local environment, so examples were reviewed against official Terraform language documentation, the AWS provider documentation, and AWS CloudWatch API/user-guide documentation rather than by running `terraform validate`.
- The examples use Terraform optional object attributes, which are appropriate for current Terraform versions but require Terraform 1.3 or later for stable `optional()` object attribute syntax.
