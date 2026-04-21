# Validation Summary: How to Plan a Terraform to OpenTofu Migration Strategy

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform
- HCL
- Terraform/OpenTofu state
- Provider dependency lock files
- CI/CD migration workflows

## Sources Consulted
- OpenTofu Migration Guide: https://opentofu.org/docs/intro/migration/migration-guide/
- OpenTofu migration from Terraform 1.5.x or lower: https://opentofu.org/docs/v1.6/intro/migration/terraform-1.5-or-lower/
- OpenTofu migration from Terraform 1.6.x: https://opentofu.org/docs/v1.6/intro/migration/terraform-1.6/
- OpenTofu migration from Terraform 1.9.x: https://opentofu.org/docs/v1.9/intro/migration/terraform-1.9/
- OpenTofu Dependency Lock File documentation: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu `providers lock` command documentation: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu `state pull` command documentation: https://opentofu.org/docs/v1.11/cli/commands/state/pull/
- OpenTofu installation documentation: https://opentofu.org/docs/intro/install/
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform version/state tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/versions
- Terraform `providers` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers
- Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count

## Issues Found
- The introduction stated OpenTofu broadly maintains HCL and state format compatibility. Updated this to say OpenTofu aims to maintain Terraform configuration compatibility and can read supported Terraform state files during migration, matching the official migration guidance and avoiding overbroad compatibility claims.
- The "Parallel Run" approach was described as "zero-risk." Changed this to "lower-risk" because running two IaC tools or workflows still has operational risk.
- The pre-migration provider audit used `terraform providers lock` as if it listed providers and versions. Replaced it with `terraform providers` and `terraform version`, because `providers lock` updates the dependency lock file.
- The legacy syntax example listed `count.index`, but `count.index` is still current and documented. Replaced it with old interpolation-only syntax.
- The state inspection example used `terraform show -json` and read `format_version`, which is the JSON output format version, not the raw state file version. Updated the example to use `terraform state pull` and read the raw state's `version` field.
- The lock file migration instructed readers to delete `.terraform.lock.hcl`, which can lose selected provider versions. Updated it to start from a committed lock file, run `tofu init`, and use `tofu providers lock` for platform checksums.
- The checklist claimed OpenTofu supports `>=1.6` feature parity. Replaced this with guidance to follow the matching OpenTofu migration guide for the source Terraform version.
- The installation checklist mentioned `tfenv`, which is Terraform-specific. Replaced it with OpenTofu-supported package manager, Homebrew, or standalone binary installation methods.
- The rollback section claimed OpenTofu state files are readable by Terraform and that no state conversion is required. Updated it to prefer restoring migration backups after OpenTofu writes state and to warn that state written after OpenTofu-only features may not be usable by Terraform.
- The conclusion implied universal compatibility and lock-file regeneration. Updated it to scope compatibility to supported migrations and to let `tofu init` create or update the lock file.

## Review Notes
Local `terraform` and `tofu` binaries were not installed in the review environment, so CLI behavior was validated against official documentation rather than local `--help` output. The post is now technically accurate for a strategic migration guide, but future revisions should revisit version-specific migration guidance as OpenTofu and Terraform continue to diverge.
