# Validation Summary: How to Download the Correct Architecture-Specific SBOM for a Chainguard Image

## Status

validated

## Post Type

Technical tutorial / guide

## Technologies Covered

- Chainguard Containers and the Chainguard Console
- Software Bills of Materials (SBOMs) in SPDX format
- Sigstore Cosign attestations and keyless verification
- OCI image indexes and multi-platform container images
- Docker and Docker Buildx
- Kubernetes node platform and scheduling metadata
- `jq`, `base64`, and shell pipelines

## Sources Consulted

- [Chainguard: How to Retrieve SBOMs and attestations for Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/retrieve-image-sboms/)
- [Chainguard: Verifying Chainguard Containers and Metadata Signatures with Cosign](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/verifying-chainguard-images-and-metadata-signatures-with-cosign/)
- [Sigstore Cosign: `cosign download attestation` command reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_download_attestation.md)
- [Sigstore Cosign: `cosign verify-attestation` command reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-attestation.md)
- [Sigstore: In-Toto Attestations](https://docs.sigstore.dev/cosign/verifying/attestation/)
- [Docker: Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Docker: `docker system info` command reference](https://docs.docker.com/reference/cli/docker/system/info/)
- [Docker: `docker buildx imagetools inspect` command reference](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [Kubernetes: Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes: Node API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [SPDX Specification 2.3](https://spdx.github.io/spdx-spec/v2.3/)

## Issues Found

- The Docker command reports the daemon's native platform, which may not be the platform selected by an explicit workload `--platform` option. Docker can also report hardware names such as `x86_64` and `aarch64`, while OCI and Cosign use `amd64` and `arm64`. Clarified both points so the value is interpreted correctly.
- The Kubernetes command originally claimed to list schedulable nodes but included cordoned nodes. Added the supported `spec.unschedulable=false` field selector and clarified that workload selectors, affinity, taints, and tolerations must also be considered.

## Review Notes

- The documented Cosign pipeline was tested successfully against a digest-pinned public `cgr.dev/chainguard/python` multi-platform image with Cosign 2.2.1 and Cosign 3.1.2.
- The SPDX retrieval, AMD64 manifest selection, public certificate issuer and identity policy, and `verify-attestation` subject binding all worked as described.
- Cosign 2.2.1 remains the documented minimum version for `cosign download attestation --platform` in Chainguard's current retrieval guide.
