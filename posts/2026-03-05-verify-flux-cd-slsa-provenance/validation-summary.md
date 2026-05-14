# Validation Summary: How to Verify Flux CD SLSA Provenance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- SLSA provenance
- slsa-verifier
- Sigstore Cosign
- GitHub Actions
- OCI container images
- Bash
- Kubernetes deployment manifests

## Sources Consulted
- Flux Security Documentation: https://fluxcd.io/flux/security/
- Flux SLSA Assessment: https://fluxcd.io/flux/security/slsa-assessment/
- slsa-verifier official documentation: https://github.com/slsa-framework/slsa-verifier
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Flux v2.4.0 GitHub release metadata: https://github.com/fluxcd/flux2/releases/tag/v2.4.0
- Flux controller GitHub release metadata for source-controller v1.4.1, kustomize-controller v1.4.0, helm-controller v1.1.0, and notification-controller v1.4.0

## Issues Found
- The Flux CLI artifact example downloaded `flux_2.4.0_linux_amd64.tar.gz.prov`, but the Flux v2.4.0 release publishes a shared `provenance.intoto.jsonl` file. Updated the download URL and `--provenance-path`.
- Controller image examples used `cosign verify-attestation` only. That verifies attestation signature identity but does not validate the expected Flux source repository and tag. Updated the main controller verification examples to use `slsa-verifier verify-image` with immutable image references, `--source-uri`, and `--source-tag`.
- Controller image examples used mutable tags. Updated examples to include verified manifest digests to match slsa-verifier guidance and avoid tag mutation/TOCTOU risk.
- The Cosign certificate identity regex was overly broad. Narrowed it to the SLSA GitHub Generator container workflow identity used by Flux controller image provenance.
- The batch verification script used Cosign only and did not check source repository/tag expectations. Updated it to call `slsa-verifier verify-image` with source URI and source tag values.
- The GitHub Actions snippet installed Cosign and verified only attestation identity. Updated it to install `slsa-verifier`, resolve image digests, and verify the expected Flux controller repository and tag.
- The post described Flux as achieving SLSA Level 3 compliance without the caveat used in Flux documentation. Updated the wording to say Flux's build, release, and provenance portions provisionally meet SLSA Build Level 3 starting with Flux 2.0.0.

## Review Notes
- The corrected examples were tested with `slsa-verifier v2.7.1` against the Flux v2.4.0 CLI artifact and the listed Flux controller images.
- The Cosign attestation inspection pipeline was tested with `cosign v3.0.6` against `ghcr.io/fluxcd/source-controller:v1.4.1`.
