# Validation Summary: How to Convert a Docker Image to an OCI Image

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Docker image format and Docker V2 Schema 2 media types
- OCI Image Specification and OCI image layouts
- Skopeo
- Docker Buildx / BuildKit exporters
- crane / go-containerregistry
- Buildah
- GitHub Actions for Docker builds

## Sources Consulted
- OCI Image Specification media types: https://specs.opencontainers.org/image-spec/media-types/
- OCI Image Manifest Specification: https://specs.opencontainers.org/image-spec/manifest/
- OCI Image Layout Specification: https://specs.opencontainers.org/image-spec/image-layout/
- Skopeo project documentation: https://github.com/containers/skopeo
- skopeo-copy man page: https://manpages.debian.org/unstable/skopeo/skopeo-copy.1.en.html
- containers-transports man page: https://www.mankier.com/5/containers-transports
- Docker Buildx build CLI reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Build exporters documentation: https://docs.docker.com/build/exporters/
- Docker image and registry exporters documentation: https://docs.docker.com/build/exporters/image-registry/
- go-containerregistry crane command docs: https://github.com/google/go-containerregistry/tree/main/cmd/crane/doc
- Buildah build man page: https://manpages.debian.org/bookworm/buildah/buildah-build.1.en.html
- Buildah commit man page: https://manpages.debian.org/testing/buildah/buildah-commit.1.en.html
- oci-image-tool validate man page: https://manpages.ubuntu.com/manpages/noble/man1/oci-image-tool-validate.1.html
- Docker GitHub Actions repositories: https://github.com/docker/setup-buildx-action, https://github.com/docker/build-push-action, https://github.com/docker/login-action

## Issues Found
- The post said layer content is identical in both formats. I softened this to say the layer filesystem content is compatible and gzip-compressed layer blobs can often be reused, because conversion can still change compression or metadata while preserving filesystem contents.
- The Skopeo registry conversion examples used `--dest-oci-accept-uncompressed-layers`, which does not force OCI manifest media types. I changed those examples to use `--format oci`.
- The Docker Buildx example claimed `--output type=oci,dest=./myapp-oci` exports an OCI layout directory. Docker documents the OCI exporter as writing an OCI layout tarball, so I changed the example to create a tarball and extract it into a directory.
- The crane section claimed `crane copy` handles format conversion automatically. Official crane docs describe `copy` as a remote image copy operation that retains digest value; `crane pull --format=oci` is the explicit OCI output path. I updated the example to pull an OCI tarball, extract it, and push the OCI layout directory.
- The OCI archive push example did not explicitly force OCI media types for the registry destination. I added `--format oci`.
- The GitHub Actions example used older Docker action major versions for setup-buildx and build-push. I updated them to current major versions as of the review date.

## Review Notes
Most commands are accurate for current Skopeo, Docker Buildx, crane, Buildah, and OCI tooling. Registry behavior can still vary by registry implementation and by whether a reference resolves to a single-platform manifest or a multi-platform index, so checking the pushed manifest media type remains necessary.
