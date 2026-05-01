# Validation Summary: How to Use Filesystem Mirrors for Provider Installation in OpenTofu (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu provider installation
- Filesystem mirrors
- Provider network mirror metadata
- HCL configuration
- Shell commands
- GitHub Actions
- NFS

## Sources Consulted
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu `tofu providers mirror` command: https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu Provider Network Mirror Protocol: https://opentofu.org/docs/internals/provider-network-mirror-protocol/
- OpenTofu `tofu version` command: https://opentofu.org/docs/cli/commands/version/
- OpenTofu Registry API for `hashicorp/aws` versions: https://registry.opentofu.org/v1/providers/hashicorp/aws/versions
- OpenTofu Registry API for `hashicorp/kubernetes` versions: https://registry.opentofu.org/v1/providers/hashicorp/kubernetes/versions
- OpenTofu Registry API for `hashicorp/vault` versions: https://registry.opentofu.org/v1/providers/hashicorp/vault/versions

## Issues Found
- The CLI configuration file locations were outdated and partly incorrect. The post used `~/.terraform.rc`, `~/.terraformrc`, and `%APPDATA%/terraform.rc` as defaults. I corrected these to the current OpenTofu defaults `~/.tofurc`, `$XDG_CONFIG_HOME/opentofu/tofurc`, and `%APPDATA%/tofu.rc`, while keeping the Terraform-era filenames only as backward-compatible alternatives.
- The `TF_CLI_CONFIG_FILE` example used `/etc/opentofu/terraform.rc`, but the OpenTofu docs specify that files set through this environment variable should follow the `*.tfrc` naming pattern. I changed the example to `/etc/opentofu/mirror.tfrc`.
- The post claimed `tofu version` shows the active CLI config file path. The official `tofu version` documentation does not support that behavior, so I removed that claim.
- The mirror directory layout example mixed the unpacked layout with packed `.zip` artifacts. I corrected it to the packed layout that `tofu providers mirror` actually creates and added the generated `index.json` and version-specific `.json` files.
- The shell example wrote `/tmp/provider-config/versions.tf` without first creating `/tmp/provider-config`. I added `mkdir -p /tmp/provider-config` so the command sequence works as written.
- The “No direct downloads allowed” comment was broader than the actual `exclude = ["registry.opentofu.org/*/*"]` rule. I narrowed the comment to “No direct downloads from `registry.opentofu.org`” to match the configuration’s real behavior.
- The JSON metadata example in the signatures section used the wrong schema. It showed a provider-registry-style `versions/protocols/platforms/shasum` document, but `tofu providers mirror` generates network-mirror-style `archives` metadata in `VERSION.json`. I replaced the example with the correct structure and clarified that filesystem mirrors ignore these JSON files when used locally.
- The section text referred to `SHA256SUMS` files and “SHA256 signatures,” which is not what the documented mirror output guarantees. I corrected this to generated JSON hash metadata.
- The CI snippet wrote `~/.terraform.rc` and passed it through `TF_CLI_CONFIG_FILE`. I updated it to use the default OpenTofu config path `~/.tofurc`, which is simpler and matches the current docs.
- The conclusion described the mirror output as including “SHA256 signatures” and said fully offline usage should exclude all providers from `direct`. I corrected the wording to hash metadata and clarified that a fully offline setup should omit `direct` entirely or exclude every provider it would otherwise match.

## Review Notes
- The example provider versions `hashicorp/aws` `5.20.1`, `hashicorp/kubernetes` `2.23.0`, and `hashicorp/vault` `3.20.0` are present in the public OpenTofu Registry as of 2026-05-01.
- The post is now technically consistent with the current OpenTofu CLI configuration and mirror documentation.
