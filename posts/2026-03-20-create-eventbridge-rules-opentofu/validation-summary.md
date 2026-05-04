# Validation Summary: How to Create AWS EventBridge Rules with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS EventBridge (formerly CloudWatch Events)
- AWS Lambda
- AWS SQS
- AWS SNS
- AWS EC2 (event source example)
- HashiCorp AWS Provider (~> 5.0)

## Sources Consulted
- HashiCorp AWS provider docs for `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- HashiCorp AWS provider docs for `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- HashiCorp AWS provider docs for `aws_cloudwatch_event_bus`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_bus
- HashiCorp AWS provider docs for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS EventBridge user guide on schedule expressions (cron / rate): https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- AWS EventBridge event pattern reference: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html
- AWS EventBridge input transformer docs: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html

## Issues Found
No technical issues found.

The post correctly uses the legacy `aws_cloudwatch_event_*` resource family, which remains the canonical naming for EventBridge resources in the HashiCorp AWS provider. Specifically verified:

- The cron expression `cron(0 2 * * ? *)` follows AWS's 6-field format (minutes, hours, day-of-month, month, day-of-week, year) and correctly uses `?` for day-of-week to satisfy the AWS rule that day-of-month and day-of-week cannot both be `*`.
- The rate expression `rate(5 minutes)` matches the documented format.
- The event pattern uses the correct top-level keys (`source`, `detail-type`, `detail`) and matches AWS's expected JSON schema for EC2 instance state-change events.
- The `input_transformer` block structure (`input_paths` map plus `input_template` string) is correct, and the `<placeholder>` substitution syntax in the template is valid.
- The Lambda permission uses the correct service principal (`events.amazonaws.com`) and `lambda:InvokeFunction` action with `source_arn` set to the rule ARN, which is the recommended pattern.
- The custom event bus example correctly threads `event_bus_name` through both the rule and the target resources.

## Review Notes
- The post does not show IAM/resource policies for SQS or SNS targets (EventBridge needs permission via a resource-based policy on those targets), nor an EventBridge IAM role for cross-account or some advanced targets. This is acceptable for a focused intro post but worth flagging if the post is ever expanded to a "production-ready" guide.
- The `aws_cloudwatch_event_rule` requires either `event_pattern` or `schedule_expression` (or, since AWS provider v5, `force_destroy` for default-bus rules). Every example satisfies this.
- AWS provider 6.x has been released; the `~> 5.0` pin is still a reasonable choice for stability and all resources used remain supported in v6, so no change is needed.
- For multiple targets on the same rule (final example), the `target_id` values must be unique per rule — the post does this correctly (`lambda`, `sqs`, `sns`).
