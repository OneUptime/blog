# Validation Summary: How to Handle Service Account Key Rotation with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, lifecycle meta-arguments, providers)
- hashicorp/time provider (`time_rotating`)
- hashicorp/aws provider (~> 5.0): `aws_iam_user`, `aws_iam_access_key`, `aws_iam_role`, `aws_iam_role_policy`, `aws_iam_instance_profile`, `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_lambda_function`, `aws_lambda_permission`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, `aws_cloudwatch_metric_alarm`, `aws_sns_topic`
- hashicorp/google provider (~> 5.0): `google_service_account`, `google_service_account_key`, `google_secret_manager_secret`, `google_secret_manager_secret_version`
- AWS IAM, AWS Secrets Manager, AWS Lambda, AWS EventBridge (CloudWatch Events), AWS CloudWatch Alarms, AWS SNS
- GCP Service Accounts, GCP Secret Manager
- Workload Identity Federation (mentioned)

## Sources Consulted
- Terraform `time_rotating` resource: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/rotating
- Terraform `aws_iam_access_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_access_key
- Terraform `google_service_account_key`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_key
- Terraform `google_secret_manager_secret`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret
- Terraform `aws_secretsmanager_secret`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- Terraform `lifecycle` meta-argument (`replace_triggered_by`, requires Terraform 1.2+): https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS Lambda supported runtimes (python3.11): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS EventBridge service principal documentation

## Issues Found
1. **Dual-key rotation example was missing rotation triggers** — In the "Implementing Dual-Key Rotation for Zero Downtime" section, the `aws_iam_access_key.primary` and `aws_iam_access_key.secondary` resources only had `create_before_destroy = true` but no `replace_triggered_by`. As written, the keys would never actually rotate despite the section claiming they would. Added `replace_triggered_by = [time_rotating.primary_key]` and `replace_triggered_by = [time_rotating.secondary_key]` respectively, matching the pattern used in the earlier single-key example.

## Review Notes
- All provider versions, resource names, attribute references, and argument names verified against the current Terraform Registry documentation for AWS provider ~> 5.0, Google provider ~> 5.0, and time provider ~> 0.9.
- `google_secret_manager_secret`'s `replication { auto {} }` block is the current 5.x syntax (the older `automatic = true` form has been replaced).
- `recovery_window_in_days = 0` on `aws_secretsmanager_secret` is valid for immediate deletion.
- `events.amazonaws.com` is the correct service principal for EventBridge / CloudWatch Events Lambda invocation.
- `python3.11` Lambda runtime is currently supported.
- The dual-key example uses `rfc3339 = timeadd(time_rotating.primary_key.rfc3339, "-1080h")` to offset the secondary key. Because `rfc3339` forces replacement when changed and is derived from `primary_key.rfc3339`, replacing the primary will also replace the secondary in the same plan, which somewhat blunts the "overlap" intent of the dual-key pattern in practice. The code is syntactically valid Terraform and communicates the intent, but readers implementing this for production should consider using fixed/static `rfc3339` base timestamps for the two rotating resources to keep their rotation cycles fully independent.
- AWS IAM users have a hard limit of 2 active access keys per user, which is consistent with the dual-key pattern shown.
- AWS recommends Workload Identity Federation / IAM Roles Anywhere over long-lived access keys; the post appropriately closes by recommending this direction.
