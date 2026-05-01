# Validation Summary: How to Encrypt Plan Files in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu state and plan encryption
- OpenTofu CLI commands: `tofu plan`, `tofu apply`, and `tofu show`
- HCL encryption configuration
- GitHub Actions CI/CD workflows
- AWS KMS as an OpenTofu key provider
- PBKDF2-derived encryption keys

## Sources Consulted
- Official OpenTofu state and plan encryption docs: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu 1.7 encryption docs, to confirm version-specific support: https://opentofu.org/docs/v1.7/language/state/encryption/
- Official OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- Official OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Official OpenTofu `show` command docs: https://opentofu.org/docs/v1.10/cli/commands/show/
- Official OpenTofu backend configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- Official `opentofu/setup-opentofu` GitHub Action repository: https://github.com/opentofu/setup-opentofu

## Issues Found
- The original setup section implied that simply enabling encryption was enough for any existing project. I corrected this by adding the migration caveat, because OpenTofu requires an `unencrypted` fallback when first encrypting pre-existing unencrypted state or plan data.
- The GitHub Actions `apply` job was incomplete. It downloaded the saved plan, but it did not check out the configuration, install the `tofu` CLI, or run `tofu init` with the encryption passphrase before `tofu apply`.
- The PBKDF2 passphrase example used `your-passphrase`, which is shorter than the documented 16-character minimum. I replaced it with a long passphrase example.
- The AWS KMS key provider example omitted the required `key_spec` setting. I added `key_spec = "AES_256"` to both KMS key provider blocks.
- The `tofu show` examples used the legacy positional syntax. I updated them to the current `-plan=...` form and fixed the `grep -E` pattern, which was invalid because the `+` character was unescaped.
- The post overstated tamper-protection behavior and used undocumented exact error text. I rewrote those lines to reflect authenticated encryption more accurately and added the important caveat that encryption does not protect against replaying an older valid plan file.

## Review Notes
- The `tofu` binary is not installed in this workspace, so CLI syntax was validated against the official OpenTofu documentation rather than local `--help` output.
- `required_version = ">= 1.7.0"` remains appropriate for this post, because OpenTofu introduced state and plan encryption in the 1.7 series.
- `tofu show -json -plan=...` remains valid, but once the plan is decrypted it can emit sensitive values in plain text, so readers should still treat that output carefully.
