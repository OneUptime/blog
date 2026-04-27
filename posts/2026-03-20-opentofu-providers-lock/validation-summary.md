# Validation Summary: Using tofu providers lock in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform-compatible dependency lock file (`.terraform.lock.hcl`)
- Provider registry (`registry.opentofu.org`)
- Filesystem and network provider mirrors

## Sources Consulted
- OpenTofu CLI documentation: `tofu providers lock` — https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu language documentation: Dependency Lock File — https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu CLI documentation: `tofu init` — https://opentofu.org/docs/cli/commands/init/

## Issues Found
No technical issues found.

The post accurately describes:
- The purpose of `tofu providers lock` (writes provider checksums to `.terraform.lock.hcl` without downloading binaries).
- The `-platform=OS_ARCH` flag and its multi-use pattern for cross-platform teams.
- The `-fs-mirror=PATH` and `-net-mirror=URL` flags for using mirrors.
- The ability to restrict the operation to specific provider source addresses (other providers in the configuration are left untouched).
- Platform identifiers (`linux_amd64`, `linux_arm64`, `darwin_amd64`, `darwin_arm64`, `windows_amd64`, `freebsd_amd64`).
- The format of lock file entries with `h1:` and `zh:` hashes (each platform contributes its own hashes since provider packages are per-platform binaries).
- The behavioral difference between `tofu init` (populates lock entries only for the current platform) and `tofu providers lock` (can extend the lock file with checksums for platforms not present locally, without downloading binaries).
- The `tofu init -upgrade` flag for upgrading providers.
- The `(unauthenticated)` notice that `tofu init` prints for providers without signed checksums.

## Review Notes
- The example hash values (`h1:abc123def456...`, `zh:789ghi012jkl...`) are clearly placeholders and the truncation is intentional, so the technically invalid base64/hex strings do not constitute a correctness issue.
- The pinned example version (`hashicorp/aws` v5.38.0) is illustrative only; readers should substitute their own versions.
- Note for future updates: OpenTofu has been gradually expanding its own provider namespaces under `registry.opentofu.org`. The `hashicorp/aws` source address used in examples is still valid via OpenTofu's registry redirects, but posts written further into the future may want to reference `opentofu/aws`-style addresses if/when the canonical namespace shifts.
