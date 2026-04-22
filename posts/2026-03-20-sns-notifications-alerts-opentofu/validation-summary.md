# Validation Summary: How to Set Up SNS Notifications and Alerts with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon SNS
- Amazon CloudWatch alarms
- AWS CLI
- HCL

## Sources Consulted
- OpenTofu CLI `init` documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply` documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `jsonencode` function documentation: https://opentofu.org/docs/language/functions/jsonencode/
- HashiCorp AWS provider `aws_sns_topic` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- HashiCorp AWS provider `aws_sns_topic_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- HashiCorp AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- HashiCorp AWS provider `aws_sns_topic_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- Amazon SNS `Subscribe` API documentation: https://docs.aws.amazon.com/sns/latest/api/API_Subscribe.html
- Amazon SNS HTTP/HTTPS subscription confirmation documentation: https://docs.aws.amazon.com/sns/latest/dg/http-subscription-confirmation-json.html
- Amazon SNS email subscription documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html
- Amazon CloudWatch SNS alarm notification documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Notify_Users_Alarm_Changes.html
- AWS CLI `sns publish` documentation: https://docs.aws.amazon.com/cli/latest/reference/sns/publish.html

## Issues Found
- The HTTP/HTTPS webhook subscription example did not mention that SNS requires HTTP/HTTPS endpoints to confirm the subscription request before notifications are delivered. I added a short note to the webhook section and updated the verification paragraph to cover pending HTTP/HTTPS subscriptions, matching Amazon SNS confirmation behavior and the AWS provider's partial support notes for unconfirmed HTTP/HTTPS subscriptions.

## Review Notes
The HCL resource names and arguments used in the SNS topic, SNS subscriptions, CloudWatch metric alarm, and SNS topic policy examples are current and match the AWS provider documentation. The examples assume supporting configuration exists elsewhere, including the AWS provider, `var.environment`, and `aws_instance.app`. For production use, the SNS topic policy could be tightened with `aws:SourceArn` and/or `aws:SourceAccount` conditions, which AWS recommends to reduce confused deputy risk.
