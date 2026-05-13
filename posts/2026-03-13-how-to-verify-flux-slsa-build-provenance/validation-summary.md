# Validation Summary: How to Verify Flux SLSA Build Provenance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- SLSA provenance
- slsa-verifier
- Sigstore Cosign
- GitHub Container Registry
- GitHub Releases
- Kubernetes controller images

## Sources Consulted
- Flux SLSA Assessment documentation: https://v2-6.docs.fluxcd.io/flux/security/slsa-assessment/
- Flux releases documentation: https://fluxcd.io/flux/releases/
- fluxcd/flux2 GitHub release v2.2.0 assets: https://github.com/fluxcd/flux2/releases/tag/v2.2.0
- fluxcd/source-controller GitHub release v1.2.0 assets: https://github.com/fluxcd/source-controller/releases/tag/v1.2.0
- slsa-framework/slsa-verifier official README and CLI help: https://github.com/slsa-framework/slsa-verifier
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- SLSA attestation model documentation: https://slsa.dev/attestation-model

## Issues Found
- The container image verification examples used mutable tag references. Current slsa-verifier rejects mutable image references, so the examples now resolve tags to immutable digest references with `crane digest` before running `slsa-verifier verify-image`.
- The expected slsa-verifier success message was outdated. It now matches current output: `PASSED: SLSA verification passed`.
- The Flux CLI binary provenance download URL was incorrect. Flux v2.2.0 publishes a shared `provenance.intoto.jsonl` asset, not a per-tarball `.tar.gz.intoto.jsonl` file, so the URL was corrected.
- The stricter verification section claimed to verify both builder and build type, but the command only specified `--builder-id`. The wording was corrected to describe builder verification only.
- The verification section described `.predicate.buildType` as a SLSA level check. That field identifies the SLSA generator build type, so the wording was corrected.
- The troubleshooting section incorrectly stated that provenance attestations are available for Flux v2.1.0 and later. It now reflects the Flux documentation's per-component minimum versions.

## Review Notes
The Flux v2.2.0 CLI artifact command was tested successfully with slsa-verifier using `provenance.intoto.jsonl`. The source-controller v1.2.0 image command was also tested successfully after changing the image reference to include its digest.
