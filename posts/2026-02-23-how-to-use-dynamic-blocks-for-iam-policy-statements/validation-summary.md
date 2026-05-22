# Validation Summary: How to Use Dynamic Blocks for IAM Policy Statements

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform dynamic blocks
- Terraform optional object attributes
- Terraform CLI outputs
- AWS IAM policy documents
- AWS IAM roles and trust policies
- AWS S3 IAM permissions
- Amazon CloudWatch Logs IAM permissions
- Amazon ECR, DynamoDB, SQS, SNS, and Secrets Manager IAM permissions

## Sources Consulted
- HashiCorp Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Terraform `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp AWS provider `aws_iam_policy_document` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS S3 IAM action mapping documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html#security_iam_service-with-iam-id-based-policies-actions
- AWS S3 `HeadObject` API permissions documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html
- AWS CloudWatch Logs service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html
- AWS account identifiers documentation: https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-identifiers.html
- AWS IAM identifiers documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html

## Issues Found
- Removed `s3:HeadObject` from the S3 read example because AWS documents `HeadObject` as requiring `s3:GetObject`; `s3:HeadObject` is not the IAM policy action to grant.
- Removed `s3:DeleteObject` from the KMS-encryption conditioned S3 write statement because the `s3:x-amz-server-side-encryption` condition applies to upload requests, not delete requests, so the delete permission would not work as shown.
- Added CloudWatch Logs log-stream ARNs alongside log-group ARNs where `logs:CreateLogStream` and `logs:PutLogEvents` are granted, because those actions authorize against log streams.
- Added object ARNs to the dev `s3:*` example so object-level S3 actions are covered in addition to bucket-level actions.
- Changed "workspace-based conditions" to "workspace-based selection" because the example selects statement lists from `terraform.workspace`; it does not use IAM condition logic for that selection.
- Replaced the example AWS account ID in an IAM role ARN with a 12-digit account ID, matching AWS account identifier format.
- Clarified the audit command comment because `terraform output -raw` reads outputs from state; it is useful after apply, while `terraform plan` is the pre-apply review step.

## Review Notes
Terraform CLI was not installed in the review environment, so local `terraform fmt` and `terraform validate` could not be run. The reviewed examples match current Terraform dynamic block syntax, the current `aws_iam_policy_document` nested block structure, and current AWS IAM action/resource documentation after the fixes above.
