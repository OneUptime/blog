# Validation Summary: How to Copy Container Images Without Losing Cosign Signatures, SBOMs, or Attestations

## Status
validated

## Post Type
Technical guide / container-image promotion guide

## Technologies Covered
- OCI Image Specification 1.1.1
- OCI Distribution Specification 1.1.1 and the referrers API
- ORAS CLI 1.3.3 recursive copy and referrer discovery
- Sigstore Cosign 3.1.3 signatures, attestations, and registry storage
- Sigstore bundles and DSSE-wrapped in-toto attestations
- SLSA provenance, SPDX SBOMs, and CycloneDX SBOMs
- Multi-platform OCI image indexes and platform manifests
- `crane`, `jq`, Docker image commands, registry authentication, and TLS

## Sources Consulted
- [ORAS `cp` command reference](https://oras.land/docs/commands/oras_cp/)
- [ORAS `discover` command reference](https://oras.land/docs/commands/oras_discover/)
- [ORAS v1.3.3 release](https://github.com/oras-project/oras/releases/tag/v1.3.3) and [recursive-copy implementation](https://github.com/oras-project/oras/blob/v1.3.3/cmd/oras/root/cp.go)
- [`oras-go` v2.6.2 extended-copy implementation](https://github.com/oras-project/oras-go/blob/v2.6.2/extendedcopy.go)
- [OCI Distribution Specification 1.1.1](https://github.com/opencontainers/distribution-spec/blob/v1.1.1/spec.md), including the referrers API and referrers-tag fallback
- [OCI Image Manifest Specification 1.1.1](https://github.com/opencontainers/image-spec/blob/v1.1.1/manifest.md)
- [OCI Image Index Specification 1.1.1](https://github.com/opencontainers/image-spec/blob/v1.1.1/image-index.md)
- [OCI Content Descriptor Specification 1.1.1](https://github.com/opencontainers/image-spec/blob/v1.1.1/descriptor.md)
- [Sigstore registry support](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Sigstore container-signing documentation](https://docs.sigstore.dev/cosign/signing/signing_with_containers/)
- [Cosign signature verification documentation](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Cosign attestation verification documentation](https://docs.sigstore.dev/cosign/verifying/attestation/)
- [Cosign v3.1.3 bundle storage specification](https://github.com/sigstore/cosign/blob/v3.1.3/specs/BUNDLE_SPEC.md)
- [Cosign v3.1.3 `verify-attestation` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify-attestation.md) and [predicate-type mapping](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/predicate.go)
- [Cosign v3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [`crane digest` reference](https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_digest.md), [`crane manifest` reference](https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_manifest.md), and [`crane copy` reference](https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_copy.md)
- [Docker image pull](https://docs.docker.com/reference/cli/docker/image/pull/), [tag](https://docs.docker.com/reference/cli/docker/image/tag/), and [push](https://docs.docker.com/reference/cli/docker/image/push/) references
- [`jq` 1.6 manual](https://jqlang.org/manual/v1.6/)

## Issues Found
No technical issues found.

## Review Notes
- ORAS 1.3.3 is the current release reviewed. `oras cp --recursive` remains Preview; `oras discover` is also Preview, and its `--format` option is marked Experimental. The post correctly recommends pinning and testing the selected ORAS version with both registry products.
- ORAS recursively copies nested referrers and, for an image index, copies its manifests and direct platform-manifest referrers. ORAS v1.3.0 fixed an edge case involving an index without direct referrers whose child manifest had referrers, so using a current pinned release is important.
- `oras discover` recursively follows the selected subject's referrers by default, but it does not independently traverse the forward children of an image index. The post correctly inventories platform-manifest digests separately.
- Cosign 3 signatures and attestations use the same Sigstore bundle artifact type, while the `dev.sigstore.bundle.content` and `dev.sigstore.bundle.predicateType` annotations provide inventory hints. The post correctly treats those annotations as hints and requires cryptographic and predicate-policy verification.
- `cosign tree` is useful for inventorying the selected subject but is not by itself proof that every nested or child-manifest referrer was found. The separate ORAS discovery and multi-platform loop cover that distinction.
- `cosign verify-attestation` writes verified DSSE envelopes as a JSON stream to standard output. The shown `jq -s '[.[].payload | @base64d | fromjson]'` pipeline correctly slurps one or more envelopes and decodes their in-toto statement payloads.
- A `COSIGN_REPOSITORY` holding OCI 1.1 bundles requires corresponding source and destination repository handling. Current Cosign 3.1.3 respects the alternate repository during verification; Cosign 3.0.x did not consistently do so, reinforcing the post's direction to use version-appropriate tooling.
- The six links in the post's Official Documentation section resolved to the intended official references during validation.
