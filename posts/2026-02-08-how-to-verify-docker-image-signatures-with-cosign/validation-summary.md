# Validation Summary: How to Verify Docker Image Signatures with Cosign

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker and OCI container images
- Cosign
- Sigstore, Fulcio, and Rekor
- GitHub Actions
- Syft and SBOM attestations
- Kyverno image verification policies
- Kubernetes admission enforcement

## Sources Consulted
- Sigstore Cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore Cosign signing containers documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign self-managed keys documentation: https://docs.sigstore.dev/cosign/key_management/signing_with_self-managed_keys/
- Sigstore Cosign signature verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore OIDC verification cheat sheet: https://docs.sigstore.dev/quickstart/verification-cheat-sheet/
- Sigstore Cosign attestation documentation: https://docs.sigstore.dev/cosign/verifying/attestation/
- Sigstore Rekor CLI documentation: https://docs.sigstore.dev/logging/cli/
- Kyverno Sigstore image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Docker Build Push Action documentation: https://github.com/docker/build-push-action

## Issues Found
- The Linux install command wrote directly to `/usr/local/bin` without `sudo`, which commonly fails for non-root users and differed from the current Sigstore install docs. Updated it to download the binary, move it with `sudo`, and mark it executable with `sudo chmod`.
- The keyless signing example used `COSIGN_EXPERIMENTAL=1`. Keyless signing is now the default Sigstore/Cosign flow when no key is provided, so the example was updated to `cosign sign ...`.
- The GitHub Actions CI keyless signing example passed `--oidc-issuer=https://token.actions.githubusercontent.com`. Current Sigstore docs describe automatic identity-token detection in GitHub Actions, with `--identity-token` used when supplying a token manually. Removed the unnecessary issuer override from the signing command.
- The workflow used older Docker/GitHub action major versions than the current official Docker examples. Updated `actions/checkout`, `docker/setup-buildx-action`, `docker/login-action`, and `docker/build-push-action` to current major versions used in official docs.
- The Rekor search example piped `cosign triangulate` into `cosign verify`, which is brittle because `triangulate` returns the signature reference rather than a clean artifact digest. Replaced it with a `cosign verify` plus `jq` extraction of the signed image digest, then passed that digest to `rekor-cli search --sha`.
- The post called Rekor "tamper-proof." Updated this to "tamper-resistant," matching Rekor's official terminology and avoiding an absolute security claim.

## Review Notes
Most core Cosign commands, key-based signing and verification, keyless verification identity flags, attestation commands, GitHub Actions permissions, and Kyverno keyless policy structure match current official documentation. The workflow signs by digest, which is the safer recommended pattern. Future improvements could mention that registry support for OCI referrers and signature storage can vary by registry and Cosign version, but the current examples are technically valid.
