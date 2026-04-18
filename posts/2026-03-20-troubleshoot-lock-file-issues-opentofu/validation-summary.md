# Validation Summary: How to Troubleshoot Lock File Issues in OpenTofu

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform dependency lock file format (`.terraform.lock.hcl`)
- Provider installation and hashing (`h1:` vs `zh:`)
- OpenTofu CLI config file (`.tofurc`) with `provider_installation` / `network_mirror`
- Git (for version controlling the lock file)
- CI/CD workflow considerations (multi-platform hashes)

## Sources Consulted
- OpenTofu Dependency Lock File: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu `init` command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `providers lock` command: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu CLI config file: https://opentofu.org/docs/cli/config/config-file/
- Terraform Dependency Lock File (same semantics): https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform `providers lock` command: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- Terraform `init` command: https://developer.hashicorp.com/terraform/cli/commands/init

## Issues Found

1. **Incorrect flag for selective provider upgrade.** The original post showed `tofu init -upgrade -lock=true` as a way to "selectively upgrade a specific provider." This is wrong on two counts: the `-lock` flag in `init` controls *state* locking (not the lock file), and `-upgrade` applies to all providers, not a single one. Replaced with `tofu providers lock hashicorp/aws`, which is the actual way to re-lock one provider by source address.

2. **Reversed explanation of `h1:` vs `zh:` hashes when using a network mirror.** The original text claimed mirrors produce `zh:` hashes instead of `h1:`. Per the OpenTofu/Terraform dependency lock documentation, it is the opposite: `zh:` hashes come from the origin registry's signed `SHA256SUMS` file, while `h1:` hashes are computed from the extracted package contents. When installing from a mirror that does not serve `SHA256SUMS`, only `h1:` hashes are recorded. Corrected both the inline code comment in the "Lock File and Private Mirrors" section and the matching sentence in the Summary.

## Review Notes
- The example `h1:` hash comments like `"h1:darwin_arm64_hash..."` are illustrative; real lock file hashes are opaque base64 strings and do not embed a platform name. Kept as-is since the comment clearly labels them as illustrative.
- `tofu init -backend=false` is valid and useful as a quick lock-file-only consistency check in CI, as stated.
- The `.tofurc` `provider_installation { network_mirror { url = "..." } }` block is syntactically correct; note that real setups often also need an `include`/`exclude` list, but that is beyond the scope of this troubleshooting post.
- The supported `-platform` values used (`linux_amd64`, `darwin_arm64`, `darwin_amd64`, `windows_amd64`) are all valid Go `GOOS_GOARCH` combinations supported by OpenTofu provider distributions.
