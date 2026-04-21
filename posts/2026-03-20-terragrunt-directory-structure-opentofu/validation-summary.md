# Validation Summary: How to Set Up Terragrunt Directory Structure for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terragrunt
- Terragrunt HCL configuration
- AWS S3 remote state backend
- DynamoDB state locking
- AWS provider default tags

## Sources Consulted
- Terragrunt HCL Blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL Functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt Global Flags reference: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt CLI Redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt root configuration migration guide: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- HashiCorp AWS provider `default_tags` support note: https://support.hashicorp.com/hc/en-us/articles/4406026108435-Known-issues-with-default-tags-in-the-Terraform-AWS-Provider-3-38-0-4-67-0
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The recommended directory structure used a shared root `terragrunt.hcl` file and child configs used `find_in_parent_folders()` with no filename. Terragrunt's current docs recommend naming shared root configuration something like `root.hcl` and using `find_in_parent_folders("root.hcl")`, so the directory tree, root config section, child include block, related paths, and conclusion were updated.
- The command examples used deprecated Terragrunt CLI forms: `run-all` and `--terragrunt-working-dir`. They were updated to the current `terragrunt run --all --working-dir ... -- <tofu-command>` form.

## Review Notes
- The `remote_state`, `generate`, `locals`, `read_terragrunt_config`, `path_relative_to_include`, and generated AWS provider examples are valid after the corrections above.
- OpenTofu supports S3 state with `dynamodb_table` locking. The current OpenTofu docs also describe native S3 lock files via `use_lockfile`, but DynamoDB locking remains supported.
- `run --all apply` and `run --all destroy` automatically add `-auto-approve` because Terragrunt cannot collect separate interactive approvals from shared stdin.
- The local `terragrunt` and `tofu` CLIs were not installed in this workspace, so CLI syntax was verified against official documentation rather than local `--help` output.
