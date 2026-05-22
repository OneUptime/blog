# Validation Summary: How to Verify Terraform Binary Integrity with SHA256 Checksums

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI binary releases
- HashiCorp release checksums
- SHA256 checksum verification
- GnuPG / PGP signature verification
- Linux, macOS, and CI/CD shell commands
- GitHub Actions workflow snippets
- Package manager verification concepts

## Sources Consulted
- HashiCorp Developer: Verify Terraform binary archives: https://developer.hashicorp.com/terraform/tutorials/cli/verify-archive
- HashiCorp Developer: Verify HashiCorp binaries: https://developer.hashicorp.com/well-architected-framework/verify-hashicorp-binary
- HashiCorp Trust Center: Security at HashiCorp, PGP public key and release archive checksum verification: https://www.hashicorp.com/en/trust/security
- HashiCorp Terraform 1.7.5 release files: https://releases.hashicorp.com/terraform/1.7.5/
- HashiCorp current PGP public key: https://www.hashicorp.com/.well-known/pgp-key.txt
- Local GNU coreutils `sha256sum --help`
- Local Perl `shasum --help`
- Local GnuPG `gpg --help` and `gpg --version`

## Issues Found
- The post imported HashiCorp's PGP key from `https://www.hashicorp.com/security/hashicorp-security.asc`. HashiCorp's current official Trust Center and verification examples publish the release-verification PGP key at `https://www.hashicorp.com/.well-known/pgp-key.txt`, so the import commands were updated to use that URL.
- The post linked readers to `https://www.hashicorp.com/security` for fingerprint cross-checking. The current canonical Trust Center security page is `https://www.hashicorp.com/en/trust/security`, so the URL was updated.
- The complete verification script checked GPG output with `grep -q "Good signature"`. This was changed to rely on `gpg --verify`'s exit status directly, which is the correct command result to branch on.

## Review Notes
- Terraform 1.7.5 release artifacts, `SHA256SUMS`, and `.sig` files are present on HashiCorp's release site.
- The published primary PGP fingerprint `C874 011F 0AB4 0511 0D02 1055 3436 5D94 72D7 468F` matches HashiCorp's current Trust Center and the current PGP key.
- A local verification of the Terraform 1.7.5 `SHA256SUMS.sig` file using HashiCorp's current PGP key succeeded and produced the expected GnuPG trust warning for an unsigned local key.
