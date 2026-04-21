# Validation Summary: How to Create AWS Systems Manager Parameters with OpenTofu - Systems Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- Terraform AWS Provider
- AWS Systems Manager Parameter Store
- AWS KMS
- AWS IAM
- AWS Lambda

## Sources Consulted
- AWS Systems Manager Parameter Store documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- AWS Systems Manager parameter tiers documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html
- AWS Systems Manager Parameter Store IAM policy documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html
- AWS Systems Manager SecureString KMS encryption documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html
- AWS Secrets Manager rotation documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html
- Terraform AWS Provider `aws_ssm_parameter` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ssm_parameter.html.markdown
- Terraform AWS Provider `aws_ssm_parameter` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ssm_parameter.html.markdown
- Terraform AWS Provider `aws_caller_identity` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/caller_identity.html.markdown
- Terraform AWS Provider `aws_iam_policy` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_policy.html.markdown
- OpenTofu CLI command documentation: https://opentofu.org/docs/cli/commands/

## Issues Found
- The Standard tier comment only mentioned the Advanced tier 8 KB limit. Updated it to clarify that Standard parameters are limited to 4 KB and Advanced parameters are limited to 8 KB.
- The `with_decryption` comment said it was required for `SecureString`. The AWS provider defaults `with_decryption` to `true`, so the comment was updated to say it decrypts `SecureString` values and note the default.
- The IAM policy snippet referenced `data.aws_caller_identity.current.account_id` without declaring the data source. Added `data "aws_caller_identity" "current" {}` before the policy resource.

## Review Notes
- The `tofu` binary is not installed in this workspace, so local OpenTofu command validation could not be run. The command names were verified against the official OpenTofu CLI documentation.
- The `SecureString` examples use the AWS provider `value` argument. This is valid, but provider documentation notes that unencrypted `SecureString` values can be stored in state, so future revisions could add a state-security caveat.
