# Validation Summary: How to Implement SLSA Level 3 Build Provenance for Kubernetes Container Images

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SLSA Build provenance
- Kubernetes
- Tekton Pipelines
- Tekton Chains
- Sigstore Fulcio, Rekor, and Cosign
- Kaniko
- Kyverno image verification policies
- GitHub Actions
- Prometheus alerting

## Sources Consulted
- SLSA v1.2 Build Track Basics: https://slsa.dev/spec/v1.2/build-track-basics
- SLSA v1.2 specification overview: https://slsa.dev/spec/v1.2/
- Tekton Chains configuration: https://tekton.dev/docs/chains/config/
- Tekton Chains SLSA provenance and type hints: https://tekton.dev/docs/chains/slsa-provenance/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Rekor CLI documentation: https://docs.sigstore.dev/logging/cli/
- Cosign verify-attestation command reference: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-attestation.md
- Kyverno verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/
- Kyverno Sigstore verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- SLSA GitHub Generator README: https://github.com/slsa-framework/slsa-github-generator
- SLSA GitHub Generator container workflow documentation: https://raw.githubusercontent.com/slsa-framework/slsa-github-generator/main/internal/builders/container/README.md
- Kaniko repository and release documentation: https://github.com/GoogleContainerTools/kaniko

## Issues Found
- The post described current SLSA as four generic levels including Level 4. Updated the explanation to the current SLSA build track terminology, Build L0 through Build L3, and removed the obsolete Build Level 4 framing.
- The SLSA Build L3 requirements were imprecise. Updated them to match hosted build platform, platform-generated provenance, isolation between runs, and signing material unavailable to user-defined build steps.
- Tekton examples used `tekton.dev/v1beta1`. Updated Pipeline, Task, and PipelineRun examples to `tekton.dev/v1`.
- Tekton Chains was configured for old `in-toto` / SLSA v0.2 provenance. Updated PipelineRun provenance to `slsa/v2alpha3`, disabled duplicate TaskRun storage, and added `CHAINS-GIT_URL` / `CHAINS-GIT_COMMIT` type-hinted results.
- The PipelineRun used `main` as the revision while claiming precise provenance. Replaced it with a full commit SHA placeholder.
- The provenance example used SLSA v0.2 fields. Updated it to SLSA provenance v1 fields such as `buildDefinition`, `runDetails`, and `resolvedDependencies`.
- Cosign verification used the old `slsaprovenance` shorthand and an incomplete GitHub identity regexp. Updated verification commands to use the explicit SLSA v1 predicate URI and stricter identity examples.
- Kyverno policy used SLSA v0.2 predicate type and an exact `subject` wildcard that would not work as intended. Updated it to SLSA v1 and `subjectRegExp`, and normalized `validationFailureAction` values.
- The GitHub Actions example incorrectly invoked a reusable workflow as a step and used an outdated SLSA generator version. Reworked it into a separate reusable workflow job using `generator_container_slsa3.yml@v2.1.0`, with required outputs and registry credentials.
- The Rekor lookup examples searched for an image tag as an artifact. Changed them to search by attestation digest.
- The hermetic build section claimed Kaniko `--reproducible` made a build hermetic. Reworded the section and corrected the flag comment to describe reproducibility rather than hermeticity.
- The keyless signing best practice incorrectly suggested rotating OIDC tokens. Replaced it with scoping and auditing trusted OIDC identities.

## Review Notes
Kaniko is archived and no longer actively maintained, but the post still uses it as a concrete Kubernetes image-builder example. The examples now pin the last documented Kaniko release instead of using `latest`; a future revision should consider BuildKit or another maintained builder.
