# Validation Summary: How to Verify Your OpenTofu Installation with Checksums - Installation

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (v1.9.0)
- SHA256 checksums (`sha256sum`, `shasum`)
- GPG / GnuPG signature verification
- Sigstore cosign (keyless verification)
- Bash scripting for CI/CD

## Sources Consulted
- OpenTofu Standalone install docs: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu GitHub release v1.9.0 asset list: https://github.com/opentofu/opentofu/releases/tag/v1.9.0
- OpenTofu GPG key endpoint: https://get.opentofu.org/opentofu.gpg
- OpenTofu DEB install docs: https://opentofu.org/docs/intro/install/deb/
- Sigstore cosign `verify-blob` documentation

## Issues Found
1. **Misidentified signature file for GPG verification.** The post labelled `tofu_<version>_SHA256SUMS.sig` as the GPG signature. In reality, OpenTofu releases ship both a cosign signature (`SHA256SUMS.sig`) and a GPG signature (`SHA256SUMS.gpgsig`). I updated the asset listing, the download step (Step 1), and the `gpg --verify` invocation (Step 3) to use `SHA256SUMS.gpgsig` for GPG verification, and added `SHA256SUMS.sig` as a separate (cosign) artifact.
2. **Cosign verify-blob missing keyless identity flags.** The original Step 4 ran `cosign verify-blob` with only `--certificate` and `--signature`. Modern cosign (keyless) requires `--certificate-identity` and `--certificate-oidc-issuer`, otherwise verification fails. I added both flags per the official OpenTofu docs, using the `v<MAJOR.MINOR>` release workflow ref and `https://token.actions.githubusercontent.com` as the OIDC issuer. I also added the missing `SHA256SUMS.sig` download in Step 4 since it is needed for cosign verification.
3. **Unused signature download in the CI/CD script.** The automation snippet downloaded `SHA256SUMS.sig` but never used it (no signature verification happened). I removed the unused download to keep the script coherent with what it actually does (checksum-only verification).

## Review Notes
- The SHA256 checksum flow (Step 2) and the install step (Step 5) are correct. `sha256sum --check --ignore-missing` is the right pattern, and `shasum -a 256` is the correct macOS equivalent.
- The `https://get.opentofu.org/opentofu.gpg` key endpoint is reachable and returns the OpenTofu signing key; `gpg --import` accepts both binary and ASCII-armored keys, so the pipe works.
- The CI/CD snippet performs only SHA256 verification (no signature check). That is a common and reasonable posture but weaker than the step-by-step flow above it — users who need strong supply-chain guarantees in CI should layer in the cosign or GPG verification from Steps 3/4.
- `v1.9.0` was accurate at the time of writing; the `TOFU_VERSION` variable makes it straightforward to bump.
