# Validation Summary: How to Create CloudWatch Composite Alarms with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- AWS CloudWatch metric alarms
- AWS CloudWatch composite alarms
- AWS Lambda metrics
- Amazon API Gateway metrics
- Amazon SNS alarm actions
- AWS CLI

## Sources Consulted
- OpenTofu CLI overview: https://opentofu.org/docs/cli/commands/
- `tofu init`: https://opentofu.org/docs/cli/init/
- `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Amazon CloudWatch composite alarms: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html
- Create a composite alarm: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Composite_Alarm.html
- `PutCompositeAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutCompositeAlarm.html
- `PutMetricAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- AWS Lambda metrics: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon API Gateway metrics and dimensions: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- AWS CLI `describe-alarms`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/describe-alarms.html
- AWS provider `aws_cloudwatch_metric_alarm` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS provider `aws_cloudwatch_composite_alarm` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_composite_alarm.html.markdown

## Issues Found
- The `lambda_duration` alarm used `statistic = "p99"`, which is not valid for percentile alarms. In CloudWatch and the AWS provider, percentile alarms must use `extended_statistic`. I changed it to `extended_statistic = "p99"` so the example matches the documented API and provider schema.

## Review Notes
- The API Gateway example uses the `AWS/ApiGateway` namespace with the `ApiName` dimension, which corresponds to REST API metrics in the AWS documentation.
- Composite alarms can reference both metric alarms and other composite alarms, and the post's nested composite alarm example is valid.
- The AWS CLI and OpenTofu commands were verified against official documentation, but `aws` and `tofu` were not installed in the local review environment, so command execution was not performed locally.
