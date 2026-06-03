# Validation Summary: How to Configure Tekton Chains for Automated Image Signing and Attestation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Chains
- Tekton Pipelines
- Kubernetes
- Sigstore Cosign
- Sigstore Rekor
- Kaniko
- SLSA / in-toto provenance

## Sources Consulted
- Tekton Chains overview and installation: https://tekton.dev/docs/chains/
- Tekton Chains configuration reference: https://tekton.dev/docs/chains/config/
- Tekton Chains signing documentation: https://tekton.dev/docs/chains/signing/
- Tekton Chains SLSA provenance documentation: https://tekton.dev/docs/chains/slsa-provenance/
- Tekton Chains Sigstore documentation: https://tekton.dev/docs/chains/sigstore/
- Tekton Getting Started Supply Chain Security guide: https://tekton.dev/docs/getting-started/supply-chain-security/
- Sigstore Cosign key management documentation: https://docs.sigstore.dev/cosign/key_management/overview/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Rekor CLI documentation: https://docs.sigstore.dev/logging/cli/

## Issues Found
- The Chains installation URL used the older `storage.googleapis.com` path. Updated it to the current official `https://infra.tekton.dev/tekton-releases/chains/latest/release.yaml` URL.
- The post described `cosign` as an `artifacts.oci.signer` value and included an unsupported `signers.cosign.key` config key. Current Chains config supports `x509`, `kms`, and `none` as artifact signer values, so the examples now use `x509` with the `signing-secrets` Secret.
- The cosign key generation notes incorrectly said the public key is displayed. Cosign writes `cosign.pub`, so the text now says the public key is written to that file.
- The Tekton manifests used `tekton.dev/v1beta1` and referenced an undefined `push-oci` task. Updated the manifests to `tekton.dev/v1`, removed the undefined task, added Pipeline results, and used Tekton result path substitutions.
- The Kaniko task used hard-coded `/tekton/results/...` paths and a malformed workspace context path. Updated the example to use `$(results.IMAGE_DIGEST.path)`, `$(results.IMAGE_URL.path)`, and `$(workspaces.source.path)`.
- The attestation configuration used unsupported keys for SLSA level, pipeline inclusion, and result inclusion. Replaced them with supported `artifacts.*.format`, `artifacts.*.storage`, and `artifacts.pipelinerun.enable-deep-inspection` settings.
- The OCI storage example used `artifacts.oci.repository` and `artifacts.oci.repository.insecure`, which are not current Chains keys. Updated them to `storage.oci.repository` and `storage.oci.repository.insecure`.
- The Rekor example used unsupported `transparency.verify` configuration and searched with `--artifact` against an image reference. Removed the unsupported key and changed the search example to `rekor-cli search --sha`.
- The annotation example referenced `chains.tekton.dev/signature`, but Tekton storage uses signature annotations with generated suffixes such as `chains.tekton.dev/signature-<key>`. Updated the command to inspect the annotations map.
- The multi-format signing section used unsupported simultaneous format configuration. Updated it to show multiple storage backends, which Chains supports through comma-separated storage values.
- The troubleshooting permission check tested `create secrets`, which is not the relevant runtime permission for signing. Updated it to check access to the signing Secret and TaskRun patch permissions.

## Review Notes
The post is now aligned with the current Tekton Chains configuration reference. In a future revision, the examples could be made more production-ready by pinning image digests instead of using `latest` tags and by adding explicit registry authentication setup for both Kaniko and the Chains controller.
