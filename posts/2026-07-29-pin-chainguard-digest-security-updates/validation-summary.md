# Validation Summary: How to Pin Chainguard Images by Digest Without Missing Security Rebuilds

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Chainguard Containers and the Chainguard Registry
- Docker and Dockerfiles
- Kubernetes container image references and pull policies
- OCI image indexes, manifests, and digests
- Sigstore Cosign
- Chainguard `chainctl`
- Grype
- Software bills of materials (SBOMs) and vulnerability scanning
- Renovate and Dependabot

## Sources Consulted
- [Chainguard: Considerations for Keeping Containers Up to Date](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/updating-images/considerations-for-image-updates/)
- [Chainguard: How to Use Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/how-to-use-chainguard-images/)
- [Chainguard: Unique Tags for Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/features/unique-tags/)
- [Chainguard: Verifying Chainguard Containers and Metadata Signatures with Cosign](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/verifying-chainguard-images-and-metadata-signatures-with-cosign/)
- [Chainguard: How to Retrieve SBOMs and Attestations for Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/retrieve-image-sboms/)
- [Chainguard: `chainctl images diff` reference](https://edu.chainguard.dev/platform/chainctl/chainctl-docs/chainctl_images_diff/)
- [Chainguard: Container Product Release Lifecycle](https://edu.chainguard.dev/chainguard/chainguard-images/about/versions/)
- [Docker: `docker buildx imagetools inspect`](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [Docker: Dockerfile `FROM` reference](https://docs.docker.com/reference/dockerfile/#from)
- [Kubernetes: Images](https://kubernetes.io/docs/concepts/containers/images/)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [OCI Descriptor and Digest Specification](https://github.com/opencontainers/image-spec/blob/main/descriptor.md)
- [Sigstore: Verifying Signatures](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Renovate: Docker Digest Pinning and Updating](https://docs.renovatebot.com/docker/#digest-pinning)
- [GitHub: Dependabot Supported Ecosystems and Repositories](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories#docker)
- [Dependabot Core: Digest-only update suppression change](https://github.com/dependabot/dependabot-core/pull/15103)

## Issues Found
- The post said that a changed digest alone does not prove changed contents. Because an OCI digest is a content identifier for the bytes of the referenced manifest or image index, changing the digest does prove that those bytes changed (absent a hash collision). It does not necessarily mean that the filesystem, packages, or application changed. The sentence was corrected to make that distinction.

## Review Notes
- The Dockerfile and Kubernetes `tag@sha256:digest` forms are valid. Kubernetes documents that only the digest is used for pulling, matching the post's explanation that the tag is a non-enforced update hint.
- The public Chainguard Python `latest` reference currently resolves to an OCI image index with `linux/amd64` and `linux/arm64` manifests. This was also checked directly with `docker buildx imagetools inspect`.
- The public Chainguard Cosign issuer and workflow identity in the post match the current Chainguard documentation. Private Production Containers use the organization-specific `catalog_syncer` or `apko_builder` identity and the Chainguard issuer, as the post notes.
- The current `chainctl images diff` reference supports `--platform` and `--output markdown`, compares SBOM packages and vulnerability scans, and states that Grype must be on `PATH`.
- Renovate explicitly supports digest-update pull requests while retaining the tag hint. Dependabot support should be verified for the exact reference and rollout in use: Dependabot Core added an experiment in May 2026 that can suppress digest-only updates for comparable, version-like tags while retaining them for non-comparable tags such as `latest`. The post's “where supported” qualification is therefore important.
- All four links in the post's Official Documentation section resolve successfully; the comparison guide redirects to its current canonical `/platform/chainctl-usage/comparing-images/` location.
