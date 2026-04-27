# Validation Summary: How to Pre-Populate Provider Lock File Checksums with tofu providers lock

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform (lock file format compatibility)
- `.terraform.lock.hcl` dependency lock file
- HCL (HashiCorp Configuration Language)
- GitHub Actions (for CI/CD example)

## Sources Consulted
- OpenTofu `providers lock` command documentation: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu Dependency Lock File documentation: https://opentofu.org/docs/language/files/dependency-lock/

## Issues Found
No technical issues found.

All technical claims verified against official OpenTofu documentation:
- The `tofu providers lock` command exists and behaves as described (consults upstream registries to write provider dependency information into the lock file).
- The `-platform=OS_ARCH` flag is correct, and the syntax (e.g., `linux_amd64`, `darwin_arm64`, `windows_amd64`) matches the documented format. Multiple `-platform` flags can be supplied, as shown.
- The `-net-mirror=URL` flag is correct for sourcing checksums from a network mirror service.
- The `-fs-mirror=PATH` flag is correct for sourcing checksums from a filesystem mirror.
- The lock file format with `provider` blocks containing `version`, `constraints`, and `hashes` fields is accurate.
- The `h1:` hash scheme (SHA256 over package contents, platform-independent) and `zh:` hash scheme (SHA256 of the zip archive, platform-specific) are correctly characterized.
- The provider source address `registry.opentofu.org/hashicorp/aws` is a valid form for the OpenTofu registry.
- The explanation of platform-specific checksum behavior — that `tofu init` only adds checksums for the current platform, and that mismatched dev/CI platforms can cause unexpected lock file mutations — is accurate.

## Review Notes
- The placeholder hash strings in the example lock files (e.g., `"zh:darwin_arm64-checksum..."`) are illustrative rather than literal. Real `zh:` hashes do not encode platform names in the hash string itself; the platform association is implicit in which package was hashed. This is a stylistic choice for clarity and is not technically incorrect for an illustrative example.
- The commit message in the "Adding Multiple Platform Checksums" example says "Add Linux checksums to lock file" but the command adds both `linux_amd64` and `darwin_arm64` checksums. This is a minor cosmetic mismatch in the example, not a technical error.
- The post applies equally well to recent OpenTofu versions; the `providers lock` subcommand and its flags have been stable.
