# Validation Summary: How to Create Resource Lifecycle Policies for Cost with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- AWS provider (hashicorp/aws)
- AWS S3 (`aws_s3_bucket_lifecycle_configuration`, storage class transitions)
- AWS Data Lifecycle Manager / `aws_dlm_lifecycle_policy` (EBS snapshots)
- AWS IAM (`aws_iam_role`, `aws_iam_role_policy_attachment`)
- AWS Lambda (`aws_lambda_function`, Python 3.11 runtime)
- AWS EventBridge / CloudWatch Events (`aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, scheduled cron)
- AWS ECR (`aws_ecr_repository`, `aws_ecr_lifecycle_policy`)
- AWS SNS (`aws_sns_topic`, `aws_sns_topic_subscription`)
- AWS CloudWatch alarms (`aws_cloudwatch_metric_alarm`)
- Terraform `lifecycle` meta-arguments (`prevent_destroy`, `ignore_changes`, `create_before_destroy`)
- Terraform built-in functions (`timestamp`, `timeadd`, `jsonencode`)

## Sources Consulted
- AWS Terraform provider docs — `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS Terraform provider docs — `aws_dlm_lifecycle_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dlm_lifecycle_policy
- AWS Terraform provider docs — `aws_ecr_lifecycle_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- AWS Lambda runtimes (Python 3.11 supported, deprecation Jun 30 2027): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS managed policy `AWSDataLifecycleManagerServiceRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSDataLifecycleManagerServiceRole.html
- AWS ECR lifecycle policy parameters: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- AWS EventBridge scheduled rule cron syntax: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Terraform `lifecycle` meta-arguments: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform `timeadd` function: https://developer.hashicorp.com/terraform/language/functions/timeadd

## Issues Found
- **Conflicting lifecycle meta-arguments combined on one resource.** The original `aws_instance.production` example set both `prevent_destroy = true` and `create_before_destroy = true` on the same resource. These conflict in practice: `prevent_destroy` blocks any destroy operation, including the destroy step that `create_before_destroy` performs after creating the replacement, so any change that forces replacement will error out. Fix: split the example into two resources — one demonstrating `prevent_destroy` + `ignore_changes` on a production instance, and a separate `aws_instance.zero_downtime` showing `create_before_destroy` on its own, with a comment noting the two cannot be combined.

## Review Notes
- The `timeadd(timestamp(), "168h")` pattern is syntactically valid Terraform, but `timestamp()` re-evaluates on every plan/apply, so any tag computed from it will always show as drift and force a perpetual diff. This is a known Terraform anti-pattern; consider documenting it as a caveat in future revisions (e.g., recommend computing the expiration outside Terraform, or using `ignore_changes = [tags["ExpirationDate"]]`).
- The Lambda example (`aws_lambda_function.resource_cleanup`) is wired to an EventBridge rule via `aws_cloudwatch_event_target`, but no `aws_lambda_permission` resource is shown to allow EventBridge to invoke the function. The code as written is not technically wrong (the post never claims to be a complete deployable example), but readers copying it will hit `AccessDeniedException` from EventBridge until they add the permission.
- `aws_cloudwatch_event_rule` is still the current resource name for EventBridge rules (EventBridge is the rebrand of CloudWatch Events; the Terraform resource was not renamed). AWS recommends EventBridge Scheduler (`aws_scheduler_schedule`) for new scheduling workloads, but the existing resource is not deprecated.
- Lambda runtime `python3.11` is supported through Jun 30, 2027 — fine for a post dated Feb 2026, but worth bumping to `python3.12` or later on the next refresh.
- All other resource attributes, IAM ARNs, S3 storage class names, ECR lifecycle JSON shape, and AWS cron syntax were verified against the current AWS Terraform provider and AWS service documentation and are correct.
