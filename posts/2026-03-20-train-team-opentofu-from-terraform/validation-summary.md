# Validation Summary: How to Train Your Team to Use OpenTofu After Migrating from Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Terraform CLI
- HCL configuration
- OpenTofu state encryption
- OpenTofu and Terraform test mocking
- CI/CD command migration

## Sources Consulted
- OpenTofu: Migrating to OpenTofu from Terraform — https://opentofu.org/docs/intro/migration/
- OpenTofu: Migration Guide — https://opentofu.org/docs/intro/migration/migration-guide/
- OpenTofu: Command references for `init`, `plan`, `apply`, `destroy`, `fmt`, `validate`, `state`, and `test` — https://opentofu.org/docs/cli/commands/
- OpenTofu: State and Plan Encryption — https://opentofu.org/docs/language/state/encryption/
- OpenTofu: OpenTofu Settings — https://opentofu.org/docs/language/settings/
- OpenTofu: OpenTofu v1.x Compatibility Promises — https://opentofu.org/docs/language/v1-compatibility-promises/
- Terraform: CLI Overview and command references — https://developer.hashicorp.com/terraform/cli/commands
- Terraform: `terraform test` command — https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform: Tests - Provider Mocking — https://developer.hashicorp.com/terraform/language/tests/mocking

## Issues Found

1. **Command behavior was described as "Identical behavior."** OpenTofu intentionally follows a similar Terraform-style workflow, but exact behavior can differ by command, version, provider registry behavior, and OpenTofu-specific features. Changed the table notes to describe these as the same core workflow rather than identical behavior.

2. **Configuration compatibility was overstated.** The post said existing Terraform configurations work without modification. OpenTofu's current migration docs say most Terraform code works without modification, but users should follow migration and verification steps. Changed the wording to "Most Terraform configurations work without modification after a verified migration."

3. **The state encryption example was incomplete for a migrated project.** OpenTofu documentation says an existing unencrypted state needs an `unencrypted` fallback when first enabling encryption. Added the `method "unencrypted" "migrate" {}` block, a `fallback` block, and a declared sensitive passphrase variable.

4. **Mock providers were implied to be OpenTofu-unique or a place where OpenTofu has more features.** Terraform v1.7.0 and later also supports `mock_provider`, `mock_resource`, and `mock_data` in the test language. Updated the wording to present mock providers as part of the `tofu test` workflow rather than as a unique OpenTofu feature.

## Review Notes
- The post is now technically accurate as a concise team-training guide.
- Local `tofu` and `terraform` binaries were not installed in the review environment, so CLI validation was performed against official OpenTofu and HashiCorp documentation rather than local `--help` output.
