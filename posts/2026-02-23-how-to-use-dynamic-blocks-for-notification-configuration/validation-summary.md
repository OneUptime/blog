# Validation Summary: How to Use Dynamic Blocks for Notification Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- Terraform `for_each` and `for` expressions
- AWS provider for Terraform
- Amazon SNS
- Amazon S3 event notifications
- Amazon EventBridge / CloudWatch Events
- Amazon CloudWatch metric alarms
- Amazon SES identity notification topics

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform AWS provider `aws_sns_topic_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider `aws_s3_bucket_notification` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification
- Terraform AWS provider `aws_cloudwatch_event_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider `aws_cloudwatch_event_target` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider `aws_ses_identity_notification_topic` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_identity_notification_topic
- AWS SNS HTTP/HTTPS subscription confirmation documentation: https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.prepare.html

## Issues Found
- The post described all notification examples as Terraform dynamic blocks, but several examples use `for_each`, `for` expressions, and flattened locals rather than Terraform `dynamic` blocks. The description, introduction, and EventBridge section text were updated to distinguish these Terraform mechanisms accurately.
- The SNS HTTPS examples used direct Slack and PagerDuty webhook URLs. SNS HTTP/S subscriptions require endpoints that can process SNS subscription confirmation and SNS notification payloads, so the examples were changed to generic SNS-compatible HTTPS endpoints.
- The EventBridge rule variable required `event_pattern` even though the example also supported scheduled rules. The attribute was changed to `optional(string)` so schedule-only rules can be represented.
- The EventBridge rule example used `is_enabled`, which the current AWS provider marks as deprecated in favor of `state`. The code now sets `state` to `"ENABLED"` or `"DISABLED"`.
- The CloudWatch metric alarm example used separate `lookup` defaults that could omit `ok_actions` or `insufficient_data_actions` when a severity was not found. The lookups were replaced with `try(..., [])` for each action list.
- The SES notification topic example recovered the SES identity resource key with `split("-", each.key)[0]`, which breaks for map keys containing hyphens. The flattened local now carries `identity_key` explicitly and uses it to reference `aws_ses_email_identity.main`.

## Review Notes
The S3 bucket notification dynamic blocks, SNS topic subscription arguments, EventBridge target arguments, CloudWatch alarm action arguments, SES notification type values, and Terraform optional object attribute syntax are consistent with the consulted documentation. Terraform was not installed in the local environment, so validation was performed against official documentation rather than by running `terraform validate`.
