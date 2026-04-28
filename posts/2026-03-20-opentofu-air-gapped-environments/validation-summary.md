# Validation Summary: How to Set Up OpenTofu in Air-Gapped Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI, `tofu init`, `tofu providers mirror`)
- OpenTofu CLI configuration (`provider_installation`, `filesystem_mirror`, `network_mirror`, `direct`)
- Provider mirror protocol / filesystem mirror layout
- Bash scripting (curl, sha256sum, unzip, tar)
- Terraform/OpenTofu module sources (Git, registry, local paths)
- nginx (network mirror server)
- GitLab CI / GitHub Actions (CI/CD examples)

## Sources Consulted
- OpenTofu CLI config file: https://opentofu.org/docs/cli/config/config-file/
- `tofu providers mirror` command: https://opentofu.org/docs/cli/commands/providers/mirror/
- Provider Network Mirror Protocol: https://opentofu.org/docs/internals/provider-network-mirror-protocol/
- OpenTofu releases: https://github.com/opentofu/opentofu/releases
- Provider Installation reference (filesystem_mirror, network_mirror, direct, include/exclude): https://opentofu.org/docs/cli/config/config-file/#provider-installation

## Issues Found
1. **Incorrect Unix CLI config filename.** The post stated the Unix config file is `~/.terraform.rc` (with an extra dot between "terraform" and "rc"). Per the OpenTofu docs, the legacy Terraform-compatible name is `~/.terraformrc` (no dot), and the OpenTofu-native name is `~/.tofurc`. Updated the comment to reference the correct names for both Unix and Windows.

2. **Wrong `tofu providers mirror` output structure.** The post showed a directory layout with a per-version subdirectory and `SHA256SUMS` / `SHA256SUMS.sig` files (e.g. `aws/5.0.0/terraform-provider-aws_5.0.0_SHA256SUMS`). The actual layout produced by `tofu providers mirror` (the "packed layout") places the zip directly in `<hostname>/<namespace>/<type>/` with no version subdirectory, and emits `index.json` / `<version>.json` metadata files instead of `SHA256SUMS`. Replaced the structure illustration with the correct one.

3. **Comment mislabeled modules as providers.** In the modules section, the comment "Providers are downloaded to .terraform/modules/" was incorrect — `.terraform/modules/` holds modules; providers go to `.terraform/providers/`. Corrected the comment to "Modules are downloaded to .terraform/modules/" and clarified the surrounding comment from "use tofu get" to "use tofu init" to match the command actually shown.

4. **Missing `mkdir -p` before redirect.** The example wrote `cat > /tmp/download-config/main.tf` without first creating `/tmp/download-config`, which would fail. Added `mkdir -p /tmp/download-config` immediately before the heredoc.

## Review Notes
- OpenTofu 1.7.0 (released 2024-04-30) is a real version, but as of 2026-04-28 the current stable is 1.11.6. The post's version pinning still works as a tutorial example; readers should substitute a current version in production.
- The CI/CD section uses a GitLab CI-style YAML (`stages`, `image`, `when: manual`, `script`) but the example filename comment says `.github/workflows/opentofu.yml`. The author parenthetically calls out "internal GitLab CI / Jenkins equivalent," so the mismatch is acknowledged; left as-is.
- The nginx snippet's `add_header Content-Type application/json;` would attempt to apply a JSON content type to all responses including the `.zip` archives. In practice nginx's `add_header` does not override the `Content-Type` produced by `mime.types`, so the snippet is largely benign, but it is also unnecessary — left as-is since it is illustrative and does not break the network mirror protocol.
- The `~/.terraform.d/plugins/` reference (now removed) was a legacy implicit local mirror path; the new comment focuses on the supported CLI config file approach, which is the modern recommendation.
- OpenTofu also supports an `oci_mirror` installation method (newer) for organizations using OCI registries; the post does not cover this but it is out of scope.
