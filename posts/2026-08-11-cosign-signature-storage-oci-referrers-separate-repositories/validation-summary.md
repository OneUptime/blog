# Validation Summary: Where Cosign Stores Image Signatures: Referrers and Repositories

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered
- Cosign v3 and Sigstore bundles
- OCI Image Specification 1.1
- OCI Distribution Specification 1.1 referrers API and fallback tag schema
- OCI-compatible container registries
- ORAS CLI 1.3 (`oras discover` and recursive `oras cp`)
- Container image signature storage, verification, retention, and mirroring

## Sources Consulted
- [Sigstore Cosign registry support and `COSIGN_REPOSITORY`](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Cosign v3.0.0 release notes](https://github.com/sigstore/cosign/releases/tag/v3.0.0)
- [Cosign v3.1.3 release notes](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [Cosign bundle specification](https://github.com/sigstore/cosign/blob/v3.1.3/specs/BUNDLE_SPEC.md)
- [Cosign legacy signature specification](https://github.com/sigstore/cosign/blob/v3.1.3/specs/SIGNATURE_SPEC.md)
- [Cosign v3.1.3 signing implementation and CLI options](https://github.com/sigstore/cosign/tree/v3.1.3/cmd/cosign/cli)
- [Cosign v3.1.3 OCI storage and lookup implementation](https://github.com/sigstore/cosign/tree/v3.1.3/pkg/oci/remote)
- [Cosign pull request #4473: honor `COSIGN_REPOSITORY` for new-bundle uploads](https://github.com/sigstore/cosign/pull/4473)
- [Cosign pull request #4836: honor `COSIGN_REPOSITORY` during new-bundle lookup](https://github.com/sigstore/cosign/pull/4836)
- [OCI Distribution Specification v1.1.1](https://github.com/opencontainers/distribution-spec/blob/v1.1.1/spec.md)
- [OCI Image Manifest Specification v1.1.1](https://github.com/opencontainers/image-spec/blob/v1.1.1/manifest.md)
- [OCI Image Index Specification v1.1.1](https://github.com/opencontainers/image-spec/blob/v1.1.1/image-index.md)
- [ORAS `discover` command reference](https://oras.land/docs/commands/oras_discover/)
- [ORAS `cp` command reference](https://oras.land/docs/commands/oras_cp/)
- [ORAS CLI v1.3.3 release](https://github.com/oras-project/oras/releases/tag/v1.3.3)

## Issues Found
- The introduction grouped registries without a native referrers API with Cosign's legacy digest-tag storage. It now distinguishes current OCI 1.1 referring artifacts, the standardized OCI fallback index, and the older Cosign `.sig` tag convention.
- The current storage description implied that signature and verification material was directly contained in the referring manifest. It now explains that the OCI image manifest has a layer referencing a serialized Sigstore bundle blob and a `subject` descriptor referencing the signed image manifest or index.
- The referrers API response was described as containing only referring manifests and as distinguishing artifacts by artifact type and media type. It now allows both image manifests and indexes, explains the roles of `artifactType` and descriptor `mediaType`, and notes the Sigstore bundle annotations used to identify current Cosign bundle content.
- The legacy Cosign `.sig` tag and OCI Distribution 1.1 fallback tag were not explicitly differentiated. The post now shows that the OCI fallback is `sha256-<digest>` without `.sig` and points to an OCI image index of referrer descriptors.
- The `COSIGN_REPOSITORY` section did not mention Cosign v3.0.x compatibility defects. It now recommends v3.1.0 or later because v3.0.x releases had bugs in one or both of the OCI-bundle separate-repository signing and verification paths.
- The signer permissions omitted read access to the signature location, which OCI clients need to query the native referrers API or read and update the standardized fallback index. The post now calls for pull and push access at the signature location.
- The retention sentence treated garbage collection and replication as if both removed artifacts. It now states that incomplete garbage collection can remove referring artifacts while incomplete replication can omit them.
- The ORAS mirroring guidance could be read as covering legacy Cosign `.sig` tags. It now limits recursive ORAS copy to OCI 1.1 referrers and says legacy tags require Cosign-aware tooling or explicit tag handling.
- The documentation attribution for registry-specific `COSIGN_REPOSITORY` path syntax was corrected from the current Sigstore registry-support page to Cosign's project documentation, where the detailed registry examples appear.

## Review Notes
The shown Cosign flags and ORAS command forms are current and syntactically valid. In ORAS 1.3, `oras discover` and recursive `oras cp` remain preview features, and recursive copy should be validated against the source and destination registries before production use. Registry retention, garbage collection, deletion, and replication behavior remains implementation-specific even when OCI 1.1 discovery works correctly.
