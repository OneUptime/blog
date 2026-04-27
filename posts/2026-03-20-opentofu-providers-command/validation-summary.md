# Validation Summary: How to Use tofu providers to List Required Providers

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform-compatible provider ecosystem (`registry.opentofu.org`)
- HCL configuration (`.tofurc`, `provider_installation` block)
- `jq` for JSON post-processing
- Dependency lock file (`.terraform.lock.hcl`)

## Sources Consulted
- OpenTofu CLI docs: `tofu providers` — https://opentofu.org/docs/cli/commands/providers/
- OpenTofu CLI docs: `tofu providers schema` — https://opentofu.org/docs/cli/commands/providers/schema/
- OpenTofu CLI docs: `tofu providers lock` — https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu CLI docs: `tofu providers mirror` — https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu CLI config docs: `provider_installation` — https://opentofu.org/docs/cli/config/config-file/#provider-installation
- OpenTofu dependency lock file docs — https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu `tofu version` command — https://opentofu.org/docs/cli/commands/version/

## Issues Found

1. **"Checking Provider Versions" section used the wrong field for release versions.** The original snippet ran `tofu providers schema -json | jq '... .value.provider.version'`. In the providers schema JSON, `provider.version` is the *schema version* (an integer such as `0` or `1`), not the actual installed provider release version (e.g., `5.31.0`). The query would have produced a misleading list of integers. Replaced it with `tofu version` (which lists installed provider versions when the working directory is initialized) and `cat .terraform.lock.hcl` (which records the selected versions).

## Review Notes
- The mirror directory layout shown is a simplified view; the real `tofu providers mirror` output also writes `index.json` and per-version JSON metadata files alongside the `.zip` packages, but the zip-file path layout shown is accurate.
- The `provider_installation` example pairs `filesystem_mirror` with `direct { exclude = ["registry.opentofu.org/*/*"] }`, which intentionally forces all `registry.opentofu.org` providers to come from the mirror — appropriate for the air-gapped use case the post describes.
- The `.terraform.lock.hcl` filename is correct: OpenTofu uses the same lock-file name as Terraform for compatibility.
- Tree output from `tofu providers` matches the documented format (root + nested module nodes with `provider[<source>] <constraint>` lines).
