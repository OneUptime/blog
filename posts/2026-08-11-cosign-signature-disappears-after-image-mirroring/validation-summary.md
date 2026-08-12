# Validation Summary: Why a Cosign Signature Disappears After Mirroring an Image to Another Registry

## Status
validated

## Post Type
Troubleshooting guide / technical reference

## Technologies Covered
- Sigstore Cosign v2.6 and v3
- Sigstore bundles and Fulcio keyless verification
- OCI Image Specification 1.1 manifests and subject relationships
- OCI Distribution Specification 1.1 Referrers API and referrers-tag fallback
- ORAS CLI 1.3 recursive copy and referrer discovery
- Crane image digest resolution
- Docker image pull, tag, and push workflows
- Container registry authentication, replication, retention, and garbage collection
- `COSIGN_REPOSITORY` signature-repository overrides

## Sources Consulted
- Sigstore registry support and `COSIGN_REPOSITORY`: https://docs.sigstore.dev/cosign/system_config/registry_support/
- Sigstore container signing and OCI 1.1 signature storage: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Cosign v3.1.3 `verify` command reference: https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md
- Cosign v2.6.0 release notes for the opt-in OCI 1.1 bundle format: https://github.com/sigstore/cosign/releases/tag/v2.6.0
- Cosign v3.1.3 Sigstore bundle storage specification: https://github.com/sigstore/cosign/blob/v3.1.3/specs/BUNDLE_SPEC.md
- Cosign v3.1.3 legacy signature storage and tag-based discovery specification: https://github.com/sigstore/cosign/blob/v3.1.3/specs/SIGNATURE_SPEC.md
- OCI Distribution Specification referrer discovery and fallback behavior: https://github.com/opencontainers/distribution-spec/blob/v1.1.1/spec.md
- OCI Image Manifest Specification `subject` relationship: https://github.com/opencontainers/image-spec/blob/v1.1.1/manifest.md
- OCI content descriptors and digest semantics: https://github.com/opencontainers/image-spec/blob/v1.1.1/descriptor.md
- ORAS 1.3 `cp` command reference: https://oras.land/docs/commands/oras_cp/
- ORAS 1.3 `discover` command reference: https://oras.land/docs/commands/oras_discover/
- Crane `digest` command reference: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_digest.md
- Docker `image pull` reference: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker `image tag` reference: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker `image push` reference: https://docs.docker.com/reference/cli/docker/image/push/

## Issues Found
- The opening and source-discovery sections described every Cosign signature as a subject-bearing OCI artifact and divided storage behavior only into “current” and “older” Cosign. Qualified the opening for Cosign v3's default storage and documented the actual transition: Cosign v2.6 introduced OCI 1.1 Sigstore bundles as an opt-in format, while Cosign v3 defaults to it but still supports the legacy digest-derived `.sig` tag format.
- The post did not clearly distinguish legacy Cosign `.sig` tags from the OCI Distribution 1.1 referrers-tag fallback. Clarified that the legacy tag points to Cosign's signature object, whereas the OCI fallback tag contains an image index of subject-bearing referrers and has no `.sig` suffix.
- The recursive-copy guidance could be read as covering every Cosign storage mode. Clarified that `oras cp --recursive` follows only subject-based referrers discoverable through the Referrers API or OCI referrers-tag fallback; it does not discover legacy Cosign `.sig` tags or cross into a separate `COSIGN_REPOSITORY`. Those objects must be copied separately.
- The ORAS compatibility wording implied that source and destination registries needed the same referrer mechanism. Updated it to explain ORAS's normal API detection and fallback and that `--from-distribution-spec` and `--to-distribution-spec` select the two endpoints independently, using `v1.1-referrers-api` or `v1.1-referrers-tag`.
- The discovery instructions relied on artifact types to classify results. Current Cosign signatures and other Sigstore attestations can share the Sigstore bundle artifact type, so the post now tells readers to record and compare `dev.sigstore.bundle.content` and `dev.sigstore.bundle.predicateType` annotations as well as digests and artifact types.
- Matching `crane digest` output was described as proving that all content had arrived. Narrowed the claim to what the comparison establishes: the top-level subject manifest or index arrived unchanged. It does not independently prove that every referenced child manifest or blob is retrievable.
- The repository-compatibility checklist asked whether referrers must live beside their subject. Replaced this with the precise OCI behavior: referrer listing is scoped to the requested repository namespace, and alternate-repository storage therefore requires an explicit verifier mapping.
- The sample `cosign verify` invocation uses Fulcio certificate identity and issuer constraints, so it is specifically a keyless verification example. Labeled it accordingly; key-based verification would instead require the appropriate `--key` trust input.
- The authentication section could imply that `--allow-insecure-registry` affects authorization. Clarified that it bypasses TLS certificate verification, does not repair authorization failures, is documented for testing only, and should be replaced in production with `--registry-cacert` or a correctly configured platform trust store.

## Review Notes
- All command examples are syntactically valid against the current documented CLIs. This includes `crane digest`, digest-qualified `oras discover`, `oras cp --recursive` from a digest to a destination tag, the two ORAS distribution-spec flags, Docker pull/tag/push, and the keyless `cosign verify` flags.
- ORAS 1.3 documents both `oras discover` and recursive `oras cp` functionality as preview. The post already advises pinning and testing the ORAS version used by the promotion pipeline.
- `oras cp --recursive` also copies the constituent manifests of an image index and can copy their discoverable referrers. The post correctly retains a separate check for whether Cosign signed the index or a platform child manifest.
- OCI referrer discovery is repository-scoped even though the Distribution Specification requires registries to accept a subject-bearing manifest when the subject itself is absent from that repository. This permits alternate signature repositories but makes the `COSIGN_REPOSITORY` mapping essential for discovery.
- Registry replication, pull-through caching, retention, and garbage-collection behavior is product-specific and is appropriately presented as something to test against the selected registry's official documentation.
- The six external links in the post's Official Documentation section resolve successfully to the intended official project documentation.
