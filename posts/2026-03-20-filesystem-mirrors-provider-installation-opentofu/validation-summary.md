# Validation Summary: How to Use Filesystem Mirrors for Provider Installation in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu provider installation configuration
- Filesystem mirrors
- Network mirrors
- GitHub Actions

## Sources Consulted
- OpenTofu CLI configuration file docs: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu `tofu providers mirror` command docs: https://opentofu.org/docs/cli/commands/providers/mirror/
- OpenTofu environment variables docs: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu dependency lock file docs: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu provider registry protocol docs: https://opentofu.org/docs/v1.9/internals/provider-registry-protocol/
- OpenTofu registry API for `hashicorp/aws` 5.31.0 Linux AMD64 package metadata: https://registry.opentofu.org/v1/providers/hashicorp/aws/5.31.0/download/linux/amd64
- `opentofu/setup-opentofu` official README: https://github.com/opentofu/setup-opentofu

## Issues Found
- The filesystem mirror layout example used zipped provider packages inside version subdirectories. OpenTofu's packed filesystem mirror layout expects the zip files directly under `HOSTNAME/NAMESPACE/TYPE`, so the example tree was corrected.
- The manual download example wrote the provider zip into the wrong path and used an incorrect download source for the verified `hashicorp/aws` `5.31.0` package. It was updated to the packed-layout destination and the current download URL returned by the OpenTofu registry API.
- The mixed mirror/direct configuration example implied a generic "mirror first, then fallback" behavior. OpenTofu tries all matching installation methods and selects the newest matching version, so the example was corrected to a precise split: mirror `hashicorp/*`, direct for everything else.
- The project-level CLI config override example used a repo-local `.tofurc` filename under `TF_CLI_CONFIG_FILE` and labeled a shell export block as HCL. It was updated to a `*.tfrc` example and a `bash` code fence to match the CLI config documentation.
- The CI workflow used `tofu providers mirror` before the `Setup OpenTofu` action installed the CLI, and it referenced `opentofu/setup-opentofu@v1` while the current official README uses `@v2`. The workflow order and action version were corrected.
- The verification snippet used a brittle `grep` pattern and an undocumented exact "expected output" line. It was changed to a more portable `grep -E` pattern and a generic instruction to look for mirror-related debug lines.
- The lock-file section described `.terraform.lock.hcl` as recording a provider binary hash. It was corrected to describe provider version selections and package checksums recorded in the `hashes` list.

## Review Notes
- Local `tofu` CLI was not installed in the review environment, so command verification relied on official OpenTofu documentation and the public OpenTofu registry API rather than local `tofu --help` output.
- For mirror-heavy or multi-platform workflows, `tofu providers lock` is worth considering in a future revision so the lock file can be populated with official checksums for the selected platforms.
