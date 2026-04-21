# Validation Summary: How to Use Terragrunt Dependencies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terragrunt
- HCL
- Terraform/OpenTofu remote state
- AWS S3 backend

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks
- Terragrunt `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run
- Terragrunt CLI Redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign
- Terragrunt Run Queue documentation: https://docs.terragrunt.com/features/stacks/run-queue
- Terragrunt migration guide for root `terragrunt.hcl`: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl
- OpenTofu `terraform_remote_state` data source documentation: https://opentofu.org/docs/language/state/remote-state-data/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/

## Issues Found
- The post used the deprecated `terragrunt run-all` command. Updated prose and commands to use the current `terragrunt run --all ...` syntax documented by Terragrunt.
- The examples used `find_in_parent_folders()` without an explicit root file name. Updated them to `find_in_parent_folders("root.hcl")` to match Terragrunt's current recommended root configuration pattern.
- The Mermaid graph showed `EKS --> RDS`, but the surrounding text describes RDS as depending on VPC and security groups, not EKS. Removed that edge so the dependency graph matches the explanation and run-order comment.

## Review Notes
- `dependency` blocks, `mock_outputs`, `mock_outputs_allowed_terraform_commands`, and `dependency.<name>.outputs` usage are valid according to Terragrunt documentation.
- The `terraform_remote_state` S3 example is syntactically valid for OpenTofu. In future revisions, consider noting that it exposes only root outputs and requires access to the full state snapshot.
