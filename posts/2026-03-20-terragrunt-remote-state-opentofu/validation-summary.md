# Validation Summary: How to Configure Terragrunt Remote State for OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terragrunt
- Terragrunt `remote_state`
- Amazon S3 backend
- DynamoDB state locking
- Google Cloud Storage backend
- OpenTofu `terraform_remote_state` data source

## Sources Consulted
- Terragrunt HCL `remote_state` and `generate` block reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt `path_relative_to_include` function reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt state backend feature documentation: https://docs.terragrunt.com/features/units/state-backend/
- Terragrunt backend bootstrap command documentation: https://docs.terragrunt.com/reference/cli/commands/backend/bootstrap/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt global flags reference: https://docs.terragrunt.com/reference/cli/global-flags/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu GCS backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu `terraform_remote_state` data source documentation: https://opentofu.org/docs/language/state/remote-state-data/

## Issues Found
- The root S3 example described `enable_lock_table_ssencryption` as enabling S3 bucket versioning. Changed the comment to say it enables server-side encryption for the DynamoDB lock table, matching Terragrunt's S3 remote state option.
- The backend resource creation section said Terragrunt creates S3 and DynamoDB backend resources automatically. Updated it to explain that current Terragrunt requires explicit backend bootstrapping with `terragrunt backend bootstrap` or `--backend-bootstrap`.
- The S3 workspace example manually interpolated `local.env` into the state key while describing workspace-based state. Changed it to use the S3 backend's `workspace_key_prefix` setting for non-default OpenTofu workspaces.
- The GCS Terragrunt example omitted `project` and `location`, which Terragrunt needs when bootstrapping a GCS bucket. Added both fields to the `remote_state.config` example.
- The remote state outputs example mixed a Terragrunt `dependency` block and an OpenTofu `data "terraform_remote_state"` block in one code block, which would not be valid as a single file. Split them into Terragrunt and OpenTofu examples.
- The verification command used the deprecated `--terragrunt-log-level` flag and a brittle log grep. Updated it to use `--log-level debug` and to inspect `backend.tf` plus `.terraform/terraform.tfstate` backend metadata.

## Review Notes
- OpenTofu 1.11 supports both native S3 locking with `use_lockfile` and DynamoDB locking. The post's DynamoDB locking examples remain valid, but teams starting fresh may prefer native S3 locking depending on their requirements.
- `terraform_remote_state` exposes only root outputs, but it still requires access to the full source state snapshot. Treat cross-project state reads as sensitive.
