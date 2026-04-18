# Validation Summary: How to Verify Your OpenTofu Installation with Checksums

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- OpenTofu (v1.9.0 used as example)
- SHA256 checksum verification (`sha256sum`, `shasum`)
- GPG signature verification (GnuPG)
- Cosign / Sigstore keyless signing
- Bash scripting

## Sources Consulted
- OpenTofu standalone install docs: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu cosign verification example (raw GitHub): https://raw.githubusercontent.com/opentofu/opentofu/main/website/docs/intro/install/examples/verify-cosign.sh
- OpenTofu install script: https://get.opentofu.org/install-opentofu.sh
- OpenTofu GPG public key: https://get.opentofu.org/opentofu.asc (and `.gpg`)
- OpenTofu v1.9.0 GitHub release asset list: https://github.com/opentofu/opentofu/releases/tag/v1.9.0
- Inspected the actual contents of `tofu_1.9.0_SHA256SUMS.pem` (confirmed to be a base64-encoded X.509 sigstore certificate, not a GPG public key)

## Issues Found

1. **Step 3 used the wrong files for GPG verification.** The post imported `tofu_${VERSION}_SHA256SUMS.pem` as a GPG public key and verified `tofu_${VERSION}_SHA256SUMS.sig` with `gpg --verify`. Both files are sigstore/cosign artifacts (the `.pem` is an X.509 ephemeral signing certificate; the `.sig` is a cosign signature). GPG cannot consume them.
   - **Fix:** Rewrote Step 3 to download the OpenTofu GPG public key from `https://get.opentofu.org/opentofu.asc`, verify the fingerprint matches `E3E6E43D84CB852EADB0051D0C0AF313E5FD9F80`, import it, and verify against the correct signature file `tofu_${VERSION}_SHA256SUMS.gpgsig`.
   - Also removed the misleading suggestion to fetch the OpenTofu key from `keyserver.ubuntu.com`; OpenTofu distributes the key at a known HTTPS URL on `get.opentofu.org`.

2. **Step 1 was missing the `.gpgsig` download.** Without this file the GPG verification path cannot succeed.
   - **Fix:** Added the `tofu_${VERSION}_SHA256SUMS.gpgsig` download alongside the existing `.sig` and `.pem` downloads, and clarified that `.sig`/`.pem` are cosign artifacts while `.gpgsig` is the GPG signature.

3. **Step 4 cosign `--certificate-identity` was wrong.** The post used `refs/tags/v${TOFU_VERSION}` (e.g., `refs/tags/v1.9.0`). The OpenTofu release workflow runs from the release branch, so the certificate identity recorded in the sigstore certificate uses `refs/heads/v${MAJOR_MINOR}` (e.g., `refs/heads/v1.9`). Verifying with the wrong identity will fail.
   - **Fix:** Derived a `TOFU_MAJORMINOR` variable and replaced the identity URL to use `refs/heads/v${TOFU_MAJORMINOR}`, matching the official `verify-cosign.sh` example shipped with the OpenTofu docs.

4. **Scripted verification block had the same GPG bug as Step 3.** It re-used `.pem`/`.sig` for GPG.
   - **Fix:** Updated the script to download `.gpgsig` and the OpenTofu GPG key from `get.opentofu.org`, and to verify with `gpg --verify ...gpgsig ...SHA256SUMS`. Removed the now-unused `.sig`/`.pem` downloads from the script's loop (they are not needed for the GPG path the script implements).

## Review Notes

- The cosign command in Step 4 still requires the user to run an interactive variable substitution that derives the major/minor version. The added `TOFU_MAJORMINOR=$(echo ... | cut -d. -f1,2)` line works for all current OpenTofu releases (1.x.y).
- The OpenTofu docs explicitly note that for alpha/beta builds the cosign certificate-identity should use `refs/heads/main` instead of a `vX.Y` branch. The post does not cover pre-release verification; this is acceptable for an intro guide but worth noting if the post is later expanded.
- The post chooses OpenTofu 1.9.0 as the worked example. This release does exist (published 2025-01-09) and all referenced asset filenames match. Newer OpenTofu releases follow the same naming convention, so the guidance generalizes.
- The macOS `shasum -a 256 -c --ignore-missing` invocation is correct; macOS ships GNU-compatible `--ignore-missing` in modern versions of `shasum` (Perl-based, ships with macOS).
- `cosign verify-blob` flags used (`--certificate`, `--signature`, `--certificate-identity`, `--certificate-oidc-issuer`, positional blob path) are current as of cosign 2.x.
