# Validation Summary: How to Sign Container Images with Cosign

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cosign
- Sigstore
- Rekor
- Fulcio
- GitHub Actions
- GitLab CI/CD
- Kyverno
- Sigstore Policy Controller
- Kubernetes admission control
- AWS KMS, GCP KMS, HashiCorp Vault, and hardware security keys

## Sources Consulted
- Sigstore Cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore Cosign container signing documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign in-toto attestation documentation: https://docs.sigstore.dev/cosign/verifying/attestation/
- Sigstore key management and KMS documentation: https://docs.sigstore.dev/cosign/key_management/overview/
- Sigstore hardware token documentation: https://docs.sigstore.dev/cosign/key_management/hardware-based-tokens/
- Sigstore OIDC with Fulcio documentation: https://docs.sigstore.dev/certificate_authority/oidc-in-fulcio/
- Sigstore Rekor CLI documentation: https://docs.sigstore.dev/logging/cli/
- Sigstore Policy Controller documentation: https://docs.sigstore.dev/policy-controller/overview/
- Sigstore Policy Controller installation documentation: https://docs.sigstore.dev/policy-controller/installation/
- Kyverno Sigstore image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- GitLab Sigstore keyless signing documentation: https://docs.gitlab.com/ci/yaml/signing_examples/
- GitLab container registry Cosign tutorial: https://docs.gitlab.com/user/packages/container_registry/cosign_tutorial/
- sigstore/cosign-installer GitHub Action README: https://github.com/sigstore/cosign-installer

## Issues Found
- The Linux installation command was pinned to Cosign v2.2.2. Updated it to use the official latest-release download URL and install sequence.
- The key-based signing section described signatures as being stored at the old `sha256-<digest>.sig` tag location. Updated the text to describe the current attached-signature/referrer workflow and show `cosign tree`.
- The GitHub Actions workflow used `sigstore/cosign-installer@v3`, which does not install current Cosign v3 releases. Updated it to `sigstore/cosign-installer@v4.1.0`.
- The GitHub Actions verification command verified the mutable tag after signing the digest. Updated it to verify the digest produced by the build step.
- The Kyverno keyless policy used a wildcard in the exact `subject` field. Updated it to use `subjectRegExp`, matching Kyverno's documented keyless attestor fields.
- The Rekor example used `rekor-cli search --email`, which is not in the current Rekor CLI documentation. Updated it to the documented `--sha` search form and included the `--rekor_server` flag.
- The GCP KMS URI omitted the required key version segment. Updated the URI to include `/versions/1`.
- The hardware-key section did not mention that security-key support requires a Cosign binary built with hardware-token support. Added that caveat.

## Review Notes
Most commands and configuration examples were otherwise consistent with current official documentation. Some examples intentionally use placeholder registry, project, and identity values that must be replaced in real deployments.
