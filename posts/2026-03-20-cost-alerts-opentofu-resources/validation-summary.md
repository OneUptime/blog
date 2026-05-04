# Validation Summary: How to Set Up Cost Alerts for OpenTofu-Managed Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- AWS Budgets (`aws_budgets_budget`)
- AWS CloudWatch billing alarms (`aws_cloudwatch_metric_alarm`, `AWS/Billing` namespace)
- AWS SNS (referenced as alarm/notification target)
- AWS cost allocation tagging

## Sources Consulted
- HCL2 string template escape sequences spec: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- Terraform string expressions / escape sequences: https://developer.hashicorp.com/terraform/language/expressions/strings#escape-sequences
- AWS provider `aws_budgets_budget` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- AWS provider `aws_cloudwatch_metric_alarm` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS Budgets API CostFilter format (TagKeyValue uses `user:<TagKey>$<TagValue>`)
- AWS Billing & Cost Management — `EstimatedCharges` metric is published only in `us-east-1` under the `AWS/Billing` namespace

## Issues Found

1. **Incorrect HCL escape in tag-value cost filter (Per-Environment Budget section).**
   - Original: `values = ["user:Environment$${each.key}"]`
   - Problem: In HCL, `$${` is a single atomic escape sequence that produces a literal `${`. So this string evaluates to the literal text `user:Environment${each.key}` — `each.key` is **not** interpolated. The intended AWS Budgets filter format `user:Environment$dev` would never be produced.
   - Fix: Used the AWS provider's documented idiom `${"$"}` to insert a literal dollar sign followed by the interpolation: `values = ["user:Environment${"$"}${each.key}"]`. This correctly evaluates to `user:Environment$dev`, `user:Environment$staging`, etc.

2. **Same HCL escape bug in CloudWatch alarm description.**
   - Original: `alarm_description = "Monthly AWS charges exceeded $${var.billing_alarm_threshold}"`
   - Problem: Same root cause — outputs the literal text `Monthly AWS charges exceeded ${var.billing_alarm_threshold}` rather than `Monthly AWS charges exceeded $1000`.
   - Fix: `alarm_description = "Monthly AWS charges exceeded ${"$"}${var.billing_alarm_threshold}"`

All other technical claims were verified and are correct:
- `aws_budgets_budget` arguments (`budget_type`, `limit_amount`, `limit_unit`, `time_unit`, `notification` block fields including `comparison_operator` `GREATER_THAN`, `threshold_type` `PERCENTAGE`, `notification_type` `ACTUAL`/`FORECASTED`, `subscriber_email_addresses`, `subscriber_sns_topic_arns`) match the current AWS provider schema.
- The `cost_filter` block syntax (`name`/`values`) is the current preferred form.
- `Service` filter value `"Amazon Elastic Compute Cloud - Compute"` is the canonical AWS service name for EC2 compute charges.
- The `AWS/Billing` namespace, `EstimatedCharges` metric, `Currency` dimension, and `us-east-1`-only constraint for billing alarms are all accurate.
- `aws_cloudwatch_metric_alarm` arguments are correct.
- The Best Practices guidance (enabling billing alerts in the Billing console as a one-time prerequisite, multi-level budgets, FORECASTED + ACTUAL combination, tagging) is accurate.

## Review Notes
- Period of `86400` seconds (daily) for `EstimatedCharges` is valid; AWS publishes `EstimatedCharges` roughly every six hours, so a shorter period like `21600` would also work and react faster, but daily is a defensible choice and not incorrect.
- `limit_amount` is documented as a string in the AWS provider, but Terraform/OpenTofu coerces numbers to strings without error, so the numeric values in the `for_each` map (`200`, `500`, `5000`) work in practice. Using string literals (`"200"`, etc.) would be slightly more idiomatic but is not required.
- Subtle pitfall not raised in the post: a CloudWatch alarm in `us-east-1` can only invoke an SNS topic that also lives in `us-east-1`. Readers wiring `aws_sns_topic.billing_alerts` from a different region will need to create that topic via the same `aws.billing` provider alias. Not technically incorrect since the SNS topic creation is left to the reader, but worth flagging.
- The `Slack Lambda` node in the Mermaid diagram is illustrative only; no implementation is shown, which is fine for a high-level architecture diagram.
