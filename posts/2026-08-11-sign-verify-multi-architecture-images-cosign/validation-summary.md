# Validation Summary: How to Sign and Verify Multi-Architecture Container Images with Cosign

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Cosign 3.1.3
- Sigstore keyless signing and AWS KMS signing
- OCI image indexes, image manifests, descriptors, and referrers
- Crane
- ORAS 1.3
- jq and Bash
- in-toto attestations and SLSA provenance
- Kubernetes container image resolution

## Sources Consulted

- [Cosign 3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [Cosign 3.1.3 signing command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign.md)
- [Cosign 3.1.3 verification command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Cosign registry details and legacy storage race](https://github.com/sigstore/cosign/blob/v3.1.3/README.md#registry-details)
- [Sigstore signature verification guide](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Sigstore key management and AWS KMS URI reference](https://docs.sigstore.dev/cosign/key_management/overview/#aws)
- [Sigstore registry support](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [OCI Content Descriptor Specification](https://github.com/opencontainers/image-spec/blob/main/descriptor.md)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [Docker Registry Manifest V2, Schema 2](https://distribution.github.io/distribution/spec/manifest-v2-2/)
- [Crane command reference](https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md)
- [ORAS 1.3 `oras cp` reference](https://oras.land/docs/commands/oras_cp/)
- [in-toto Statement v1 specification](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md)
- [SLSA Build Provenance v1.2](https://slsa.dev/spec/v1.2/build-provenance)
- [Kubernetes image documentation](https://kubernetes.io/docs/concepts/containers/images/)
- [jq manual](https://jqlang.org/manual/)
- [GNU Bash pipeline semantics](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)

## Issues Found

- The OCI descriptor explanation implied that every index entry has platform metadata. Changed it to state that `digest` is required while `platform` is normally present only for platform-specific targets, and adjusted the signature-binding explanation accordingly.
- The child-verification pipeline could succeed without checking any child when `manifests` was empty. Changed `jq -r` to `jq -er` so an empty result fails, and corrected the explanation of how `set -e` and `pipefail` propagate verifier and upstream failures.
- The selected-platform example did not enforce its stated exactly-one requirement: `jq -e` accepts multiple non-null outputs. Changed it to collect matches, require an array length of one, and raise an error for missing or duplicate descriptors.
- The explicit child enumeration covered only immediate descriptors even though OCI permits nested indexes. Documented the flat-index assumption and the need to walk nested indexes recursively when they are policy subjects.
- The verification helper used keyless certificate flags even though the preceding alternative showed AWS KMS signing. Added the matching KMS verification form and `--yes` to the unattended KMS signing example.
- ORAS recursive copying applies to OCI referrers and is currently a preview option; it does not automatically discover legacy Cosign signature tags. Qualified the promotion guidance and noted that legacy tag-based storage requires those tags to be copied.
- The provenance bullet incorrectly referred to subjects as part of the predicate. Corrected it to the in-toto Statement's top-level `subject` field and retained the need to evaluate predicate semantics.
- Architecture-specific child digests can be scheduled onto incompatible Kubernetes nodes without placement constraints. Clarified that the child-trust model must schedule workloads onto matching architectures.

## Review Notes

Cosign's `sign --recursive`, keyless identity flags, AWS KMS URI, and lack of recursive verification are current in Cosign 3.1.3. ORAS 1.3 marks `--recursive` as preview. The post's GitHub links target mutable `main` branches, so CI should continue pinning tool versions and periodically revalidate command behavior.
