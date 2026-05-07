# Validation Summary: How to Sign Images in CI with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container image signing
- Sigstore cosign
- GitHub Actions
- OpenID Connect (OIDC)
- GPG / simple signing
- containers policy.json
- containers registries.d configuration

## Sources Consulted
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman image trust documentation: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- Sigstore cosign signing containers documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore cosign verifying signatures documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore cosign project quick start / README: https://github.com/sigstore/cosign
- Sigstore cosign-installer GitHub Action documentation: https://github.com/sigstore/cosign-installer
- containers/image `containers-policy.json(5)` documentation: https://raw.githubusercontent.com/containers/image/main/docs/containers-policy.json.5.md
- containers/image `containers-registries.d(5)` documentation: https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.d.5.md

## Issues Found
- Cosign examples signed mutable tags. Updated the key-based and GitHub Actions examples to capture the pushed digest with `podman push --digestfile` and sign/verify `IMAGE@sha256:...`, matching cosign's recommendation to sign images by digest.
- Keyless cosign examples used `COSIGN_EXPERIMENTAL=1`. Removed it because keyless signing is now the default supported cosign workflow.
- Keyless verification example omitted the required expected signer identity and issuer. Added `--certificate-identity` and `--certificate-oidc-issuer` to show current cosign verification requirements.
- GitHub Actions workflow omitted `contents: read` while overriding job permissions. Added it so `actions/checkout` has the expected repository read permission.
- GitHub Actions workflow used `sigstore/cosign-installer@v3`. Updated it to the current documented `sigstore/cosign-installer@v4.1.0`.
- GitHub Actions workflow signed the tag instead of the pushed digest and verified with a broad identity regexp. Updated it to sign/verify the digest and use the exact GitHub Actions workflow identity.
- The GPG section said the policy configured Podman to sign images when pushing, but `policy.json` is used for verification when pulling. Clarified the comments and added an explicit `podman push --sign-by "${GPG_FINGERPRINT}"` command.
- The GPG section referenced `/etc/pki/containers/signer.pub` without creating it. Added a `gpg --armor --export` command to create the public key file used by verification policy.
- The registries.d example used deprecated `sigstore` / `sigstore-staging` keys for simple-signing lookaside storage. Replaced them with current `lookaside` / `lookaside-staging` keys.

## Review Notes
The examples remain illustrative and use placeholder registries, identities, and signature storage URLs. In a production CI setup, users should pin installer/action versions according to their update policy, protect signing credentials, and keep the verification identity aligned with the exact workflow file, branch, and repository used for signing.
