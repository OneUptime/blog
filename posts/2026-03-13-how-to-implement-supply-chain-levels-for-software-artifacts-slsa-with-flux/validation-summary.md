# Validation Summary: How to Implement Supply Chain Levels for Software Artifacts (SLSA) with Flux

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SLSA
- Flux OCIRepository
- Kubernetes
- GitHub Actions
- SLSA GitHub Generator
- slsa-verifier
- Cosign / Sigstore
- Kyverno
- crane

## Sources Consulted
- SLSA v1.2 Build Track Basics: https://slsa.dev/spec/v1.2/build-track-basics
- SLSA tracks overview: https://slsa.dev/spec/v1.2/tracks
- SLSA GitHub Generator README and workflow documentation: https://github.com/slsa-framework/slsa-github-generator
- SLSA GitHub Generator v2.1.0 container generator workflow: https://github.com/slsa-framework/slsa-github-generator/blob/v2.1.0/.github/workflows/generator_container_slsa3.yml
- SLSA GitHub Generator v2.1.0 generic generator workflow: https://github.com/slsa-framework/slsa-github-generator/blob/v2.1.0/.github/workflows/generator_generic_slsa3.yml
- slsa-verifier README and CLI examples: https://github.com/slsa-framework/slsa-verifier
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux security documentation: https://fluxcd.io/flux/security/
- Kyverno verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Verify SLSA Provenance sample policy: https://kyverno.io/policies/other/verify-image-slsa/verify-image-slsa/
- Sigstore Cosign attestation verification documentation: https://docs.sigstore.dev/cosign/verifying/attestation/

## Issues Found
- The post described SLSA as four current levels including Level 4. Updated this to the current SLSA track model and Build L0-L3 levels because the current SLSA specification uses tracks and the build track currently defines L0 through L3.
- The GitHub Actions container workflow referenced a nonexistent `steps.build.outputs.image` output. Added an `id` to the image info step and pointed the job output to `steps.image-info.outputs.image`.
- The SLSA GitHub Generator examples used `v1.9.0`, which upstream documents as affected by a TUF mirror issue. Updated the reusable workflows and builder IDs to `v2.1.0`.
- The `slsa-verifier verify-image` examples used mutable image tags. Updated them to resolve and verify immutable tag-plus-digest references with `crane`, matching slsa-verifier guidance.
- The deployment verification script used `set -e` and then checked `$?`, which would exit before the failure branch. Rewrote it as an `if slsa-verifier ...; then` block.
- The Flux section claimed Flux verifies SLSA provenance attestations. Corrected it to say Flux verifies signed OCI artifacts and OIDC identities; SLSA predicate validation still requires `slsa-verifier` or an admission policy.
- The Flux OIDC subject matched the SLSA generator workflow rather than the workflow that signs the OCI artifact. Replaced it with an example application workflow identity.
- The Kyverno attestation example used `type` for the attestation predicate. Updated it to `predicateType`, matching Kyverno's SLSA provenance examples.
- The monitoring script used a wildcard `--source-uri`, but slsa-verifier expects an exact GitHub repository URI. Updated the script to derive an exact `github.com/...` source URI for matching GHCR images and to skip unrelated images.
- The verification and troubleshooting Cosign examples used mutable tags. Updated them to verify the digest-resolved image reference.
- The summary and verification checklist implied Flux performs provenance verification. Updated the wording to distinguish SLSA provenance verification from Flux OCI artifact signature verification.

## Review Notes
- The Kyverno example uses `ClusterPolicy`, which Kyverno still documents in its verifyImages and SLSA sample policies, though newer Kyverno releases also provide CEL-based policy types for some use cases.
- The Flux OCIRepository example assumes the OCI artifact containing manifests is signed separately with Cosign keyless signing; the SLSA container generator creates provenance attestations for images but does not by itself create a Flux-verifiable OCI artifact signature.
