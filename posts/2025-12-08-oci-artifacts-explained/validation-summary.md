# Validation Summary: OCI Artifacts Explained: Beyond Container Images

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OCI Image Specification
- OCI Distribution Specification
- OCI artifacts and referrers
- ORAS CLI
- Helm OCI charts
- Cosign and Sigstore
- Open Policy Agent bundles
- Kyverno / admission-time verification

## Sources Consulted
- OCI Image Manifest Specification v1.1.0: https://github.com/opencontainers/image-spec/blob/v1.1.0/manifest.md
- OCI Descriptor Specification v1.1.0: https://github.com/opencontainers/image-spec/blob/v1.1.0/descriptor.md
- OCI Annotation Specification v1.1.0: https://github.com/opencontainers/image-spec/blob/v1.1.0/annotations.md
- OCI Distribution Specification v1.1.0: https://github.com/opencontainers/distribution-spec/blob/v1.1.0/spec.md
- ORAS artifact concepts: https://oras.land/docs/concepts/artifact/
- ORAS push command documentation: https://oras.land/docs/commands/oras_push/
- ORAS attach command documentation: https://oras.land/docs/commands/oras_attach/
- ORAS discover command documentation: https://oras.land/docs/commands/oras_discover/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Sigstore Cosign signing other OCI artifact types: https://docs.sigstore.dev/cosign/signing/other_types/
- Sigstore Cosign signature specification: https://github.com/sigstore/cosign/blob/main/specs/SIGNATURE_SPEC.md
- OPA bundle documentation: https://www.openpolicyagent.org/docs/management-bundles
- Kyverno Sigstore image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/

## Issues Found
- The OCI summary attributed both `artifactType` and the Referrers API to the OCI Image Spec. Updated it to distinguish Image Spec v1.1 manifest fields (`artifactType`, `subject`) from the Distribution Spec v1.1 Referrers API.
- The manifest example was fenced as JSON but contained JavaScript-style comments, invalid digest placeholders, and a `subject` descriptor without the required `size` field. Removed the comments and replaced placeholders with valid descriptor-shaped values.
- The manifest example used `org.opencontainers.artifact.created`, which uses a reserved OCI annotation prefix but is not a defined OCI key. Changed it to the defined `org.opencontainers.image.created` annotation.
- The ORAS command included commented lines after trailing backslashes, which would break if pasted into a shell. Removed the inline explanatory comments from inside the continued command.
- The post said to use an `oras push --subject` flag, but current ORAS documentation exposes subject attachment through `oras attach`. Updated the guidance to use `oras attach --artifact-type ... <image>@<digest> <file>`.

## Review Notes
The remaining examples and explanations are accurate at the guide level. Some details, especially Cosign storage behavior and registry Referrers API support, can vary by registry/tool version, but the post now describes the current OCI 1.1 model and ORAS CLI behavior correctly.
