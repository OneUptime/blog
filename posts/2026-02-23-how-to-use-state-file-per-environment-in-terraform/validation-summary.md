# Validation Summary: How to Use State File Per Environment in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform S3 backend
- Terraform workspaces
- Terraform backend partial configuration
- AWS S3 IAM policies
- AWS IAM MFA condition keys
- GitHub Actions environments

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform backend partial configuration documentation: https://developer.hashicorp.com/terraform/language/backend
- Terraform CLI workspace documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform workspace command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace
- AWS IAM global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- GitHub Actions deployments and environments documentation: https://docs.github.com/en/actions/reference/deployments-and-environments

## Issues Found
- The S3 backend examples used `dynamodb_table` for state locking. Terraform now marks DynamoDB-based S3 backend locking as deprecated and recommends S3 lockfiles with `use_lockfile = true`, so the backend examples and backend config file were updated.
- The IAM example granted DynamoDB lock permissions and omitted the S3 permissions needed for native S3 lockfiles. The policies now include bucket listing, state object access, and `.tflock` object permissions required by the S3 backend when `use_lockfile` is enabled.
- The wrapper script used `.terraform/environment` as a custom marker file. Terraform uses that path for workspace selection, so the marker was changed to `.terraform/backend-environment` to avoid interfering with CLI workspace behavior.

## Review Notes
- Terraform CLI was not installed in the local workspace, so CLI behavior was checked against official Terraform documentation instead of local `terraform --help` output.
- Workspaces remain technically valid, but Terraform documentation cautions that CLI workspaces are not a strong isolation mechanism when environments need separate credentials and access controls.
