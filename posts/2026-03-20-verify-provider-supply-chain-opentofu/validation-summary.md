# Validation Summary: How to Verify Provider Supply-Chain Safety in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (tofu CLI)
- Terraform dependency lock file (`.terraform.lock.hcl`)
- HCL configuration language
- GPG / PGP signing
- SHA256 checksums
- OpenTofu Provider Registry Protocol
- `provider_installation` CLI config (network_mirror, direct)
- CI enforcement via `-lockfile=readonly`

## Sources Consulted
- OpenTofu dependency lock file documentation: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu Provider Registry Protocol: https://opentofu.org/docs/internals/provider-registry-protocol/
- OpenTofu `init` command reference: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `providers lock` command reference: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu CLI configuration file docs: https://opentofu.org/docs/cli/config/config-file/
- HashiCorp Trust & Security (GPG key fingerprint): https://www.hashicorp.com/trust/security
- Live OpenTofu registry response for hashicorp/aws 5.40.0: https://registry.opentofu.org/v1/providers/hashicorp/aws/5.40.0/download/linux/amd64

## Issues Found
1. **Incorrect checksum filename format.** The post stated the checksums file is named `terraform_x.x.x_SHA256SUMS`. The actual registry-served filename is `terraform-provider-<name>_<version>_SHA256SUMS` (e.g. `terraform-provider-aws_5.40.0_SHA256SUMS`). Updated the text to reflect the correct format.
2. **Non-existent signing-keys endpoint.** The post's curl example hit `https://registry.opentofu.org/v1/providers/hashicorp/aws/signing-keys`, which is not part of the provider registry protocol. Signing keys are returned as the `signing_keys` field of the package-download endpoint. Replaced the example with `curl -s https://registry.opentofu.org/v1/providers/hashicorp/aws/5.40.0/download/linux/amd64 | jq .signing_keys`.
3. **Imprecise hash description in the lock file snippet.** The original comments said the `h1:` hash is "computed from the zip archive" and `zh:` is "computed per-platform binary". Per OpenTofu docs, `h1:` is a dirhash of the extracted archive contents, and `zh:` is the SHA256 of the zip archive itself (one per platform). Rewrote the two inline comments for accuracy.

## Review Notes
- The HashiCorp GPG fingerprint `C874 011F 0AB4 0511 0D02 1055 3436 5D94 72D7 468F` (key ID `72D7468F`) is correct and was renewed under HCSEC-2026-03 with validity extended to 2030-03-01, so the reference is current.
- OpenTofu reads both `~/.terraformrc` (for Terraform back-compat) and `~/.tofurc` (preferred); the post's reference to `~/.terraformrc` is still valid. A future revision could mention `~/.tofurc` as the more OpenTofu-idiomatic location.
- The AWS provider binary path and the `_v5.40.0_x5` naming (plugin protocol 5) are correct for v5.40.0. This could shift for providers that adopt plugin protocol 6.
- `tofu init -lockfile=readonly`, `tofu providers lock -platform=...`, and the `provider_installation` HCL block syntax are all valid as written.
