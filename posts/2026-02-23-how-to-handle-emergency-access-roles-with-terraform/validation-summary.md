# Validation Summary: How to Handle Emergency Access Roles with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (users, roles, login profiles, access keys, policies)
- AWS Secrets Manager
- AWS CloudWatch Events / EventBridge
- AWS CloudWatch Logs (metric filters) and Alarms
- AWS SNS (topics, subscriptions)
- AWS S3 (buckets, objects, versioning)
- AWS CloudTrail (event patterns, user identity)
- Azure AD (`azuread` provider v2.x: users, directory role assignments)
- GCP IAM (service accounts, organization IAM members)
- hashicorp/aws ~> 5.0, hashicorp/azuread ~> 2.0, hashicorp/google ~> 5.0

## Sources Consulted
- Terraform AWS provider docs for `aws_iam_user`, `aws_iam_user_login_profile`, `aws_iam_access_key`, `aws_iam_role`, `aws_secretsmanager_secret`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_log_metric_filter`, `aws_cloudwatch_metric_alarm`, `aws_sns_topic`, `aws_s3_object`, `aws_s3_bucket_versioning` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- Terraform azuread provider v2.x docs for `azuread_user`, `azuread_directory_role` (data source), `azuread_directory_role_assignment` (https://registry.terraform.io/providers/hashicorp/azuread/2.x/docs)
- Terraform Google provider docs for `google_service_account`, `google_organization_iam_member` (https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- AWS CloudTrail event reference and EventBridge event pattern docs (detail-type for "AWS API Call via CloudTrail" and "AWS Console Sign In via CloudTrail")
- AWS IAM policy condition reference (`aws:MultiFactorAuthPresent`)
- HCL2 syntax specification regarding object expression keys (hyphenated keys must be quoted)
- Microsoft Graph unified role assignments API (for `azuread_directory_role_assignment.role_id` semantics — accepts the role definition / template ID for built-in roles)

## Issues Found
1. **Unquoted HCL key `detail-type` in `jsonencode` block** — In the `aws_cloudwatch_event_rule.break_glass_usage` resource, the event pattern used `detail-type = [...]` as a bare key. Hyphens are not valid in HCL bare identifiers, so HCL would attempt to parse this as the subtraction expression `detail - type`, causing a syntax error. Fixed by quoting the key as `"detail-type" = [...]`. The other keys in the same object (`detail`, `userIdentity`, `arn`) contain no hyphens and remain valid as bare identifiers.

## Review Notes
- The `azuread_directory_role_assignment.role_id` is set to `data.azuread_directory_role.global_admin.template_id`. This is correct for the unified role assignments API used by this resource — for built-in directory roles, the `roleDefinitionId` expected by Microsoft Graph corresponds to the role template ID. (The `object_id` of the data source would represent the activated role's instance ID and is a separate concept; using `template_id` here is the intended pattern.)
- `aws_iam_user_login_profile.password` is exported only when no PGP key is supplied; the plaintext password is then stored in Terraform state. The post stores it in Secrets Manager, which is sensible, but readers should be reminded that the state file itself becomes sensitive — worth highlighting in a future revision.
- `force_password_change` on `azuread_user` defaults to `false` in the v2.x provider, so the explicit setting is harmless but redundant; left as-is for clarity.
- The CloudWatch metric filter pattern `"{ $.userIdentity.userName = \"break-glass-admin\" }"` assumes JSON-formatted CloudTrail logs and an existing log group named `aws-cloudtrail-logs`. Both are reasonable assumptions for a tutorial but depend on the reader's CloudTrail setup.
- The `aws:MultiFactorAuthPresent` condition only validates short-term session credentials at the time of role assumption; it does not enforce MFA for the underlying IAM user session. This is standard AWS behavior and the code is correct, just worth being aware of.
- The post uses the modern split between `aws_s3_bucket` and `aws_s3_bucket_versioning` (correct for AWS provider v4+) and uses `aws_s3_object` (the non-deprecated name). Good.
- The post correctly recommends at least two break-glass accounts and demonstrates this in the Azure example, but only creates one for AWS and GCP. Not a technical error, just an asymmetry a future revision could address.
