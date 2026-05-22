# Validation Summary: How to Reduce Terraform Plan Time with -refresh=false

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform plan and apply workflows
- Terraform state refresh and refresh-only mode
- Terraform state locking
- Terraform CLI environment variables
- CI/CD planning workflows

## Sources Consulted
- HashiCorp Developer: `terraform plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Developer: `terraform apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Developer: `terraform refresh` command reference: https://developer.hashicorp.com/terraform/cli/commands/refresh
- HashiCorp Developer: Use refresh-only mode to sync Terraform state: https://developer.hashicorp.com/terraform/tutorials/state/refresh
- HashiCorp Developer: Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Developer: State locking: https://developer.hashicorp.com/terraform/language/state/locking
- OneUptime internal links were checked and returned HTTP 200.

## Issues Found
- The post described refresh as exactly one API call per resource and said `-refresh=false` skips all of those API calls. Updated the wording to reflect Terraform's documented behavior: `-refresh=false` disables state synchronization with remote objects and can reduce remote API requests, while provider reads may require one or more calls per resource.
- The post used the deprecated `terraform refresh` command in examples. Replaced those examples with `terraform apply -refresh-only`, which HashiCorp recommends as the safer replacement because it allows review before committing state changes.
- The post said Terraform 1.1+ introduced `-refresh-only`. Corrected this to Terraform 0.15.4+, matching the official command documentation.
- The post described `-refresh-only` as updating state without planning any changes. Updated this to "without planning infrastructure changes" because refresh-only mode still creates a plan to update state and root output values.
- The post said combining `-refresh=false` with `-target` is usually safe. Softened this claim to clarify that it is useful for fast development checks but still does not detect drift in targeted resources or dependencies.
- The heading "Using -refresh-only for Targeted Refresh" was inaccurate because the examples were periodic full refresh-only operations, not targeted refresh. Renamed it to "Using -refresh-only for Periodic Refresh."

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against current official HashiCorp documentation rather than local `terraform --help` output. The remaining examples use valid Terraform CLI flags, but the article should continue to frame `-target` and `-auto-approve` as exceptional or development-only tools because HashiCorp documents targeting and unattended apply workflows as higher-risk.
