# Validation Summary: How to Bundle OpenTofu with All Dependencies for Offline Use

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Bash
- Provider mirrors / filesystem mirrors
- OpenTofu dependency lock files
- Air-gapped / offline deployment workflows

## Sources Consulted
- OpenTofu CLI configuration file docs: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu `tofu init` docs: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `tofu providers mirror` docs: https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu `tofu providers lock` docs: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu module source docs: https://opentofu.org/docs/v1.9/language/modules/sources/
- OpenTofu provider requirements docs: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu 1.7.0 release asset index: https://get.opentofu.org/tofu/1.7.0/
- OpenTofu GitHub releases page: https://github.com/opentofu/opentofu/releases

## Issues Found
- The post used non-existent `opentofu_...` binary asset names and checksum files. I changed them to the official `tofu_...` release asset names and added `darwin_amd64`, which OpenTofu 1.7.0 also publishes.
- The bundle script copied only `*.tf` files with a Bash `**` glob that is not recursive by default and flattened the configuration. I replaced that with copying the full configuration tree so relative module sources and `.terraform.lock.hcl` are preserved.
- The original module-bundling approach copied cached modules into `/opt/opentofu/modules`, but OpenTofu would not automatically use that directory for module installation. I changed the bundle to ship a prepared configuration directory with `.terraform/modules` already populated and updated the offline init command to `tofu init -backend=false -get=false`.
- The CLI config file was named `terraform.rc` even though the post configures it via `TF_CLI_CONFIG_FILE`. I renamed it to `opentofu.tfrc` and simplified the `provider_installation` block to use the filesystem mirror exclusively for offline operation.
- The draft did not pre-populate provider checksums for every bundled platform. I added `tofu providers lock` for the bundled platforms so the copied lock file matches the multi-platform provider mirror.
- The validation script used `grep -P`, which is not portable across common Unix environments. I changed it to `grep -E`.
- The conclusion said `TF_CLI_CONFIG_FILE` would be set globally for all users, but the documented example only set it in a user shell profile. I corrected the wording to per-user or per-automation shell environment.

## Review Notes
- The post is now technically sound for bundling a specific, already-initialized OpenTofu configuration for offline reuse.
- The example remains pinned to OpenTofu `1.7.0`. The GitHub releases page shows newer releases are available as of 2026-05-06, so the version is older but still valid for the documented asset names and commands.
