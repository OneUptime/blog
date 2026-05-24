# Validation Summary: How to Create IAM Policies with jsonencode in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, `jsonencode`, `flatten`, `for` expressions, `title` function, locals, variables)
- AWS IAM (policy documents, version `2012-10-17`, Sid/Effect/Action/Resource/Condition)
- AWS services referenced in examples: S3, DynamoDB, CloudWatch Logs, KMS, SQS
- Terraform AWS Provider resources: `aws_iam_policy`, `aws_iam_role_policy`

## Sources Consulted
- Terraform `jsonencode` function docs: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform `flatten` function docs: https://developer.hashicorp.com/terraform/language/functions/flatten
- Terraform `title` function docs: https://developer.hashicorp.com/terraform/language/functions/title
- Terraform AWS Provider `aws_iam_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Terraform AWS Provider `aws_iam_role_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- AWS IAM Policy Reference (Version, Statement, Sid, Effect, Action, Resource, Condition): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
- AWS IAM Condition Operators (`Bool`, `IpAddress`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-operators.html
- AWS Global Condition Context Keys (`aws:MultiFactorAuthPresent`, `aws:SourceIp`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS announcement about fine-grained IAM actions for Billing/Account/Payments and the retirement of `aws-portal:*`: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/migrate-granularaccess-iam-mapping.html

## Issues Found
- **Deprecated `aws-portal:*` action in the deny example.** AWS migrated billing/account/payments permissions to fine-grained service namespaces and retired the legacy `aws-portal:*` action prefix. Replaced `aws-portal:*` with the modern equivalents `account:*`, `billing:*`, and `payments:*` in the `DenyBillingAccess` statement so the example reflects current AWS IAM action namespaces. The other actions in that statement (`budgets:*`, `cur:*`) remain valid and were kept.

## Review Notes
- All `jsonencode` usage, `aws_iam_policy` / `aws_iam_role_policy` resource attributes, ARN formats, condition operators, condition keys, and Terraform functions (`flatten`, `for`, `title`) are correct as of the validation date.
- The claim that IAM `Bool` conditions expect string values like `"true"` is accurate — AWS documents condition values as strings.
- The Terraform 1.0+ prerequisite is reasonable; `jsonencode` has been available since Terraform 0.12, so this is comfortably supported.
- The inline policy example references `aws_iam_role.my_role.id` without showing the role definition. This is fine for an illustrative snippet but readers will need to define the role themselves.
- "Compile-time validation of the structure" in the benefits paragraph is slightly loose — `jsonencode` validates HCL syntax and JSON structural validity, but it does not validate IAM policy semantics. Not incorrect enough to require editing.
