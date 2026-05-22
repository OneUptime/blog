# Validation Summary: How to Use Workspaces vs Separate State Files in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform state and backends
- Terraform S3 backend
- AWS IAM and S3 bucket policies
- HCP Terraform workspaces
- CI/CD pipeline patterns for Terraform

## Sources Consulted
- Terraform Language documentation: Workspaces - https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform CLI documentation: Manage workspaces - https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform CLI command reference: workspace select - https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform S3 backend documentation - https://developer.hashicorp.com/terraform/language/backend/s3
- HCP Terraform documentation: Workspaces - https://developer.hashicorp.com/terraform/cloud-docs/workspaces
- OneUptime linked migration post URL, checked with HTTP 200 response - https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-workspaces-to-directory-based-environments/view

## Issues Found
- The S3 backend examples used a top-level `role_arn` argument. Current Terraform S3 backend documentation shows role assumption configured with `assume_role = { role_arn = "..." }`, so both dev and prod backend examples were updated to use `assume_role`.
- The decision framework referred to "Terraform Cloud" workspaces. Current official documentation uses "HCP Terraform", so that wording was updated while preserving the original point about HCP Terraform workspaces being different from CLI workspaces.

## Review Notes
- Terraform was not installed in the local environment, so CLI flags were verified against the official Terraform command documentation instead of local `terraform --help` output.
- The post's guidance that CLI workspaces are best for similar deployments and not ideal for strict environment isolation is consistent with HashiCorp's current documentation.
- The numeric thresholds for "fewer than 20 resources" and "50+ resources" are practical heuristics rather than official Terraform limits.
