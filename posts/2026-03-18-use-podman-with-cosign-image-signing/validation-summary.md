# Validation Summary: How to Use Podman with Cosign for Image Signing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Cosign
- Sigstore
- Rekor
- GitHub Actions OIDC
- Trivy
- Syft
- OCI image signing and attestations

## Sources Consulted
- Sigstore Cosign installation docs: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore Cosign container signing docs: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign verification docs: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore OIDC verification cheat sheet: https://docs.sigstore.dev/quickstart/verification-cheat-sheet/
- GitHub Actions OIDC reference: https://docs.github.com/en/actions/reference/security/oidc
- Cosign CLI docs for `sign`: https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md
- Cosign CLI docs for `verify`: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md
- Cosign CLI docs for `attest`: https://github.com/sigstore/cosign/blob/main/doc/cosign_attest.md
- Cosign CLI docs for `verify-attestation`: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-attestation.md
- Podman image trust docs: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- Podman push docs: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- `containers-policy.json` man page: https://www.mankier.com/5/containers-policy.json
- `containers-registries.d` man page: https://www.mankier.com/5/containers-registries.d
- Trivy vulnerability attestation docs: https://trivy.dev/docs/v0.61/guide/supply-chain/attestation/vuln/
- Syft output formats reference: https://github.com/anchore/syft/wiki/output-formats
- Rekor CLI source for `search`: https://github.com/sigstore/rekor/blob/main/cmd/rekor-cli/app/search.go
- Rekor CLI source for `get`: https://github.com/sigstore/rekor/blob/main/cmd/rekor-cli/app/get.go

## Issues Found
- The Go install command used the outdated `github.com/sigstore/cosign/v2/...` module path. It was updated to `v3`, which is the current major version in the official installation docs.
- The Fedora/RHEL install example used `sudo dnf install cosign`, which is not the current official Sigstore installation path documented for RPM-based installs. It was replaced with the official RPM installation flow from Sigstore's docs.
- The signing and verification examples used mutable image tags. They were updated to capture and use the pushed image digest so the examples sign and verify the exact image that was published.
- The keyless signing section said the signing certificate is recorded in Rekor. This was tightened to the more accurate statement that the signing event is recorded in the Rekor transparency log.
- The SBOM example used the older `cosign attach sbom` plus `cosign sign --attachment sbom` flow. That attachment-signing flow is deprecated in current Cosign CLI docs, so it was replaced with `cosign attest --type spdxjson`.
- The build pipeline script signed a mutable tag, used `spdx` for an SPDX JSON file, and was written in a way that could block automation. It was updated to sign the pushed digest, use `spdxjson`, and add `--yes` for non-interactive signing.
- The deployment script warned specifically that no vulnerability attestation was found for any `verify-attestation` failure. That message was corrected to say the attestation is missing or failed verification.
- The GitHub Actions workflow attempted to install Cosign with Homebrew on `ubuntu-latest`, which is incorrect for a standard GitHub-hosted Ubuntu runner. It was replaced with the official `sigstore/cosign-installer` action.
- The GitHub Actions verification step used an email-based identity regex, which is incorrect for GitHub Actions keyless signatures. It was corrected to use the workflow identity URI and the GitHub Actions OIDC issuer.
- The Podman `policy.json` example omitted the `signedIdentity` requirement needed for Cosign-style signatures and also omitted the separate `registries.d` configuration required to read Sigstore attachments from registries. Both were added.

## Review Notes
- Podman policy validation with `signedIdentity: { "type": "matchRepository" }` verifies Cosign signatures for the same repository, but mutable tags can still be retargeted to different signed digests. The updated examples therefore use digest references throughout the signing and deployment flows.
- The RPM install example mirrors the current official Sigstore docs and uses the x86_64 release asset; readers on other architectures would need the matching release package for their platform.
