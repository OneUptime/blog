# Validation Summary: How to Inspect Chainguard Tag History and See What Changed Between Rebuilds

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Chainguard Containers and Chainguard Registry
- `chainctl` image history, changelog, and diff commands
- OCI image indexes, manifests, descriptors, and digests
- Docker Engine CLI and Docker Buildx
- SPDX software bills of materials (SBOMs)
- Cosign and Sigstore attestations
- Grype vulnerability scanning
- Package URLs (PURLs)
- `curl` and `jq`

## Sources Consulted
- [Using the Chainguard Tag History API](https://edu.chainguard.dev/chainguard/chainguard-images/features/using-the-tag-history-api/)
- [`chainctl images history` reference](https://edu.chainguard.dev/platform/chainctl/chainctl-docs/chainctl_images_history/)
- [`chainctl images changelog` reference](https://edu.chainguard.dev/platform/chainctl/chainctl-docs/chainctl_images_changelog/)
- [`chainctl images diff` reference](https://edu.chainguard.dev/platform/chainctl/chainctl-docs/chainctl_images_diff/)
- [Manage Chainguard Container Images with `chainctl`](https://edu.chainguard.dev/platform/chainctl-usage/chainctl-images/)
- [Compare Chainguard Containers with `chainctl`](https://edu.chainguard.dev/platform/chainctl-usage/comparing-images/)
- [Retrieve SBOMs and attestations for Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/retrieve-image-sboms/)
- [Verify Chainguard Containers and metadata signatures with Cosign](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/verifying-chainguard-images-and-metadata-signatures-with-cosign/)
- [Docker `pull` reference](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker `image inspect` reference](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [Docker `buildx imagetools inspect` reference](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [OCI Descriptor Specification](https://github.com/opencontainers/image-spec/blob/main/descriptor.md)
- [Sigstore attestation verification documentation](https://docs.sigstore.dev/cosign/verifying/attestation/)
- [Grype vulnerability database documentation](https://oss.anchore.com/docs/guides/vulnerability/database/)

## Issues Found
- The post said `chainctl images diff` compares packages by package URL alone. The current reference says it compares PURLs and versions, so the explanation now states both comparison keys.
- The Docker section described `docker image inspect` as inspecting manifests, but that command reads the selected local image's metadata and configuration. The text now accurately calls this a local configuration comparison.
- The Buildx guidance implied that the default `imagetools inspect` view exposes layer sizes. The text now specifies `--raw` and platform-specific manifests, whose layer descriptors contain the layer digests and compressed sizes.
- The Tag History API section generalized anonymous token access to all public images. Chainguard documents anonymous access for Free public images, which expose tags such as `latest` and `latest-dev`; the text now scopes the example to `python:latest`.
- The manual SBOM example printed both downloaded attestations to standard output even though the following guidance told readers to retain the signed envelopes. It now saves the old and new DSSE envelopes to separate JSON Lines files for verification and comparison.

## Review Notes
- The documented flags and output choices were checked against `chainctl` 0.2.322, released on 2026-07-28.
- The anonymous token and `python:latest` history request were smoke-tested against `cgr.dev`; the endpoint returned the documented timestamp and digest fields.
- The SPDX attestation command was smoke-tested with Cosign 3.1.2 against a current `python` index digest for `linux/amd64`.
- Vulnerability differences remain time-sensitive because Grype updates its local vulnerability database. Retaining the `chainctl` and Grype versions plus `grype db status` output with a report is appropriate.
- Organization Production Container commands require an authenticated `chainctl` session and the relevant organization capabilities.
