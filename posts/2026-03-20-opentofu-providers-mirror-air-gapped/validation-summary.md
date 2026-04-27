# Validation Summary: How to Use tofu providers mirror for Air-Gapped Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- `tofu providers mirror` command
- OpenTofu CLI configuration (`~/.tofurc`)
- `provider_installation` / `filesystem_mirror` block
- Terraform/OpenTofu dependency lock file (`.terraform.lock.hcl`)
- OpenTofu Registry (`registry.opentofu.org`)
- HashiCorp AWS and Kubernetes providers

## Sources Consulted
- [tofu providers mirror | OpenTofu](https://opentofu.org/docs/cli/commands/providers/mirror/)
- [CLI Configuration File | OpenTofu](https://opentofu.org/docs/cli/config/config-file/)
- [Dependency Lock File | OpenTofu](https://opentofu.org/docs/language/files/dependency-lock/)
- [Provider Requirements | OpenTofu](https://opentofu.org/docs/language/providers/requirements/)
- [Provider Registry Protocol | OpenTofu](https://opentofu.org/docs/internals/provider-registry-protocol/)
- [hashicorp/aws on the OpenTofu Registry](https://search.opentofu.org/provider/hashicorp/aws/latest)

## Issues Found
No technical issues found.

Verified specifically:
- `tofu providers mirror <target-dir>` syntax is correct, and `-platform=<os>_<arch>` may be specified multiple times.
- The output layout `registry.opentofu.org/<namespace>/<provider>/<version>/terraform-provider-<provider>_<version>_<os>_<arch>.zip` is the documented "packaged" filesystem-mirror layout produced by the command.
- `~/.tofurc` is a valid OpenTofu CLI configuration file path on Unix systems (with `~/.terraformrc` accepted for backward compatibility).
- The `provider_installation { filesystem_mirror { path, include } }` block syntax matches the documented form.
- OpenTofu still uses `.terraform.lock.hcl` as the dependency lock file name (not renamed from Terraform).
- `hashicorp/aws` resolves to `registry.opentofu.org/hashicorp/aws` on the OpenTofu Registry.

## Review Notes
- The directory-structure tree is a simplified illustration. In addition to the `.zip` files shown, `tofu providers mirror` also writes `index.json` and per-version `<version>.json` index files used by the network mirror protocol. They are not required when the directory is used purely as a `filesystem_mirror`, so omitting them from the example tree is acceptable; readers expecting an exhaustive listing may be mildly surprised.
- The example `tofu init` output in Step 4 is illustrative; the exact wording produced by `tofu init` differs slightly between OpenTofu versions, but the post does not claim it is verbatim.
- Hard-coded versions in the example tree (`aws` 5.31.0, `kubernetes` 2.25.0) are reasonable real versions and used only as illustrative values; they do not need to be kept current.
