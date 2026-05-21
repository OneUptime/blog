# Validation Summary: How to Implement Istio Image Signing and Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Sigstore Cosign
- Kubernetes admission control
- Kyverno
- Sigstore Policy Controller
- ORAS
- GitHub Actions
- OCI container images

## Sources Consulted
- Istio Image Signing and Validation: https://istio.io/latest/docs/ops/best-practices/image-signing-validation/
- Istio Download the Istio Release: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Sigstore Cosign Verifying Signatures: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign In-Toto Attestations: https://docs.sigstore.dev/cosign/verifying/attestation/
- Sigstore Policy Controller Overview: https://docs.sigstore.dev/policy-controller/overview/
- Sigstore Policy Controller Installation: https://docs.sigstore.dev/policy-controller/installation/
- Kyverno ClusterPolicy image verification docs: https://main.kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno ImageValidatingPolicy docs: https://kyverno.io/docs/policy-types/image-validating-policy/
- ORAS copy command docs: https://oras.land/docs/1.1/commands/oras_cp/

## Issues Found
- The post used keyless GitHub Actions identity verification for official Istio images. Istio's documented verification flow uses the Istio public key at `https://istio.io/misc/istio-key.pub`. I changed the cosign commands, GitHub Actions example, Kyverno policy, Sigstore Policy Controller policy, and mirroring script to verify with that public key. I also confirmed locally that the corrected `docker.io/istio/pilot:1.24.0` command verifies successfully with cosign v3.0.6.
- The post claimed Istio publishes SBOM attestations for the cited release image and showed a `cosign verify-attestation` command. I could not verify an SBOM attestation for `docker.io/istio/pilot:1.24.0` or `gcr.io/istio-release/pilot:1.24.0`; both returned no matching attestations. I changed the section to describe verifying SBOM attestations only when they are published for the image, such as for a user's mirrored image.
- The mirroring script used `cosign copy`, which is deprecated in current cosign. I replaced the separate `crane copy` and `cosign copy` steps with `oras cp -r`, which copies an artifact and its referrers.
- The monitoring section said the command checked for unverified images, but the command only lists pod image references. I changed the wording so it accurately describes the command as input for verification-policy monitoring.

## Review Notes
- The Kyverno `ClusterPolicy` example remains a valid style, but Kyverno also has newer `ImageValidatingPolicy` resources for image verification in recent versions.
- Istio 1.24.0 is no longer a current supported release as of this review date, but it remains usable as a concrete example tag for demonstrating signature verification.
