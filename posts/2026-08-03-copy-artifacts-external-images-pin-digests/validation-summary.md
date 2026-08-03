# Validation Summary: `COPY --from` External Images: Pin Digests, Not Mutable Tags

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Docker and Dockerfile syntax
- BuildKit and Docker Buildx
- Multi-stage builds and external `COPY --from` image sources
- OCI image manifests, multi-platform image indexes, and content digests
- Container registries and Docker Hub
- Supply-chain security and reproducible build practices

## Sources Consulted

- [Dockerfile reference: `COPY --from`, global `ARG` use in `FROM`, and `COPY --chmod`](https://docs.docker.com/reference/dockerfile/)
- [Docker multi-stage builds: use an external image as a stage](https://docs.docker.com/build/building/multi-stage/#use-an-external-image-as-a-stage)
- [Docker build best practices: pin base image versions](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions)
- [Docker Buildx `imagetools inspect` reference](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [Docker image pull: pull by immutable digest](https://docs.docker.com/reference/cli/docker/image/pull/#pull-an-image-by-digest-immutable-identifier)
- [Docker Buildx build checks and `--check`](https://docs.docker.com/reference/cli/docker/buildx/build/#call-check)
- [Docker build-check behavior and failing on violations](https://docs.docker.com/build/checks/)
- [Docker image-input validation policies](https://docs.docker.com/build/policies/validate-images/)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [Docker Hub official Alpine image](https://hub.docker.com/_/alpine), checked through the live registry with `docker buildx imagetools inspect alpine:3.23`

## Issues Found

- The post said that using a platform-specific manifest digest for a different target should fail. Current BuildKit may instead complete the build while reporting an `InvalidBaseImagePlatform` warning. Changed the sentence to describe that behavior and to require CI to treat the mismatch warning as a failure rather than assuming the build stops automatically. This was reproduced with Docker Buildx 0.33.0 by targeting `linux/arm64` while referencing Alpine's `linux/amd64` manifest; the normal build exited successfully with the warning, while `docker buildx build --check` returned a nonzero status.

## Review Notes

- The pinned digest `sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40` was confirmed through Docker Hub as the OCI multi-platform index currently referenced by `alpine:3.23` (Alpine 3.23.5 platform manifests at validation time). Hashing the raw index returned by `docker buildx imagetools inspect --raw` produced the same digest.
- The first Dockerfile example was built successfully for both `linux/amd64` and `linux/arm64` with Docker Buildx 0.33.0, and `/etc/ssl/certs/ca-certificates.crt` was confirmed to exist in the pinned Alpine image.
- The private-registry hostname, image, and 64-hex digest are clearly identified as placeholders and are syntactically valid templates, not runnable concrete references.
- The final `debian:bookworm-slim` base in the named-stage example is tag-pinned but not digest-pinned. That does not invalidate the example's focus on pinning the external artifact source, but a build requiring end-to-end reproducibility should pin every image input, including the final base image.
