# Validation Summary: How to Run Terraform and OpenTofu Side by Side

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Terraform CLI
- OpenTofu CLI
- asdf version manager
- Terraform and OpenTofu S3 backends
- Terraform/OpenTofu provider dependency lock files
- GitHub Actions

## Sources Consulted
- OpenTofu installation documentation: https://opentofu.org/docs/intro/install/
- OpenTofu standalone installer documentation: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu Terraform 1.9 migration guide: https://opentofu.org/docs/v1.9/intro/migration/terraform-1.9/
- OpenTofu basic CLI features: https://opentofu.org/docs/cli/commands/
- OpenTofu dependency lock file documentation: https://opentofu.org/docs/language/files/dependency-lock/
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform version command documentation: https://docs.hashicorp.com/terraform/cli/commands/version
- hashicorp/setup-terraform GitHub Action README: https://github.com/hashicorp/setup-terraform
- opentofu/setup-opentofu GitHub Action README: https://github.com/opentofu/setup-opentofu
- actions/checkout GitHub Action README/releases: https://github.com/actions/checkout
- asdf getting started documentation: https://asdf-vm.com/guide/getting-started-legacy.html
- asdf plugin registry: https://github.com/asdf-vm/asdf-plugins

## Issues Found
- The OpenTofu curl installer example piped the script directly into `sh` without the required `--install-method` argument. Replaced it with the documented download, chmod, run, and cleanup sequence using `--install-method standalone`.
- The examples used Terraform 1.9.0 with OpenTofu 1.9.0. The official OpenTofu Terraform 1.9 migration guide says to use Terraform 1.9.8 before migrating to OpenTofu 1.9.0, so Terraform examples were updated to 1.9.8.
- The directory tree was fenced as `hcl` even though it was not HCL syntax. Changed the fence to `text`.
- The warning section said running both tools against the same state file is safe. Updated it to warn against alternating tools on one state and to frame a same-directory switch as a migration with state backup, plan verification, and lock file regeneration.
- The lock-file comment attributed `.terraform.lock.hcl` to `terraform apply`. Corrected it to `terraform init`, which is what creates or updates provider dependency locks.
- The GitHub Actions examples used older action majors. Updated `hashicorp/setup-terraform` to v4, `opentofu/setup-opentofu` to v2, and `actions/checkout` to v6 to match current official action documentation.
- The second OpenTofu CI job did not pin `tofu_version`, so it would install the latest OpenTofu instead of the migration bridge version used elsewhere in the post. Added `tofu_version: "1.9.0"`.
- The conclusion described Terraform and OpenTofu as sharing a "binary interface." Reworded it to say the CLIs are similar but each workload should have one owning tool and one state.

## Review Notes
- OpenTofu's current documentation is for 1.11.x, but the post keeps OpenTofu 1.9.0 because the official Terraform 1.9 migration path uses OpenTofu 1.9.0 as the migration bridge before upgrading OpenTofu further.
- The S3 backend snippets are syntactically valid and use documented `bucket`, `key`, and `region` arguments.
- The `terraform` block name remains correct for OpenTofu configuration.
