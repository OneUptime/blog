# Validation Summary: How to Create IAM Roles with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS IAM (roles, policies, instance profiles, role policy attachments)
- AWS managed policies (SSM, CloudWatch Agent, Lambda Basic/VPC Execution)
- AWS STS (AssumeRole, ExternalId)
- AWS services referenced in example policies: S3, Secrets Manager, SQS, EC2, Lambda

## Sources Consulted
- Terraform AWS Provider — `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform AWS Provider — `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider — `aws_iam_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Terraform AWS Provider — `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- Terraform AWS Provider — `aws_iam_instance_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- AWS IAM — Managed policies vs inline policies: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html
- AWS IAM — Cross-account access with ExternalId: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html
- AWS managed policy reference (AmazonSSMManagedInstanceCore, CloudWatchAgentServerPolicy, AWSLambdaBasicExecutionRole, AWSLambdaVPCAccessExecutionRole)

## Issues Found
- **Section heading "Custom Inline Policy" was technically incorrect.** The example uses `aws_iam_policy` plus `aws_iam_role_policy_attachment`, which creates a customer-managed policy, not an inline policy. An inline policy would use `aws_iam_role_policy` (policy embedded in the role itself). Per AWS IAM taxonomy these are distinct concepts. Renamed the heading to "Custom Managed Policy" to accurately reflect what the code does.

## Review Notes
- All HCL syntax is valid for current Terraform/OpenTofu AWS provider versions.
- All four AWS managed policy ARNs are correct, including the `service-role/` path prefix on the Lambda policies.
- The Lambda trust policy omits `effect = "Allow"`, which is valid because `effect` defaults to `"Allow"` in `aws_iam_policy_document`. This is intentional brevity, not a bug.
- The `aws_iam_role_policy_attachment` resource correctly takes the role name (not ARN) in the `role` field — matches provider docs.
- The cross-account trust example correctly demonstrates the recommended ExternalId pattern (`StringEquals` on `sts:ExternalId`) for the confused-deputy mitigation.
- Code references `aws_s3_bucket.assets`, `aws_sqs_queue.tasks`, `data.aws_caller_identity.current`, and several variables (`var.environment`, `var.region`, `var.lambda_in_vpc`, `var.trusted_account_id`, `var.external_id`) that are assumed defined elsewhere — typical for a focused tutorial snippet.
