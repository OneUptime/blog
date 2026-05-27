# Validation Summary: How to Set Up Container Image Signing and Verification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud KMS
- Google Cloud Artifact Registry
- Google Cloud Build
- Google Kubernetes Engine
- Cosign / Sigstore
- Kyverno image verification policies
- Google Binary Authorization
- Terraform

## Sources Consulted
- Sigstore Cosign key management documentation: https://docs.sigstore.dev/cosign/key_management/overview/
- Sigstore Cosign signing containers documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign attestation documentation: https://docs.sigstore.dev/cosign/verifying/attestation/
- Kyverno ClusterPolicy image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Google Cloud KMS key rotation documentation: https://docs.cloud.google.com/kms/docs/key-rotation
- Google Cloud KMS IAM documentation: https://cloud.google.com/kms/docs/iam
- Google Cloud KMS IAM roles reference: https://cloud.google.com/iam/docs/roles-permissions/cloudkms
- Google Cloud SDK Artifact Registry image describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Kubernetes Engine container image digest documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/about-container-images
- Google Binary Authorization overview: https://docs.cloud.google.com/binary-authorization/docs/overview
- Google Binary Authorization create attestations documentation: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Binary Authorization GKE CLI tutorial: https://docs.cloud.google.com/binary-authorization/docs/getting-started-cli
- Google Cloud SDK Binary Authorization attestations reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/binauthz/attestations/create

## Issues Found
- The Terraform KMS example configured `rotation_period` on an asymmetric signing key. Cloud KMS does not support automatic rotation for asymmetric keys, so the rotation period was removed.
- The setup section used `cosign generate-key-pair --kms` after the KMS key had already been created in Terraform. Replaced it with `cosign public-key --key ... > cosign.pub`, which retrieves the public key while keeping the private key in KMS.
- Cosign KMS examples used an unversioned GCP KMS URI. Updated Cosign commands to use the versioned URI format documented by Sigstore.
- The Cosign attestation example used `--type https://in-toto.io/Statement/v0.1`, which is the statement envelope type rather than the predicate type. Updated it to `https://slsa.dev/provenance/v0.2` for the provenance-style predicate shown.
- The sample digest `sha256:abc123` was not a valid SHA-256 image digest. Replaced it with a syntactically valid 64-hex-character placeholder digest.
- The Kyverno policy attempted to verify image signatures and attestations in the same `verifyImages` entry and used `type` for the attestation selector. Split signature and attestation verification into separate entries and changed the attestation selector to `predicateType`.
- The Binary Authorization Python sample did not create a valid Binary Authorization attestation and never called a creation API. Replaced it with the documented `gcloud container binauthz attestations sign-and-create` flow after Cosign verification.
- The key rotation command passed unsupported `--algorithm` and `--protection-level` flags to `gcloud kms keys versions create`. Removed those flags and added `--primary`, then clarified that Cosign commands and verification policies must be updated to trust the new key version.

## Review Notes
- The Cloud Build example assumes the Cloud Build service account also has the Artifact Registry permissions required to push images.
- Cosign verification may require transparency log flags depending on whether signatures are uploaded to Rekor; the post's examples keep the default signing flow.
- Kyverno's older `ClusterPolicy` image verification is still documented, but current Kyverno documentation marks ClusterPolicy as deprecated in favor of newer policy types.
