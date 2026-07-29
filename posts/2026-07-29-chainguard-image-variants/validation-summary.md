# Validation Summary: Chainguard `latest`, `latest-dev`, and `-full` Image Variants

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- Chainguard Containers
- Chainguard Free and Production Containers
- Distroless container images
- Docker CLI
- Dockerfiles and multi-stage builds
- Python virtual environments
- Container image tags, digests, SBOMs, signatures, and provenance

## Sources Consulted

- [Chainguard's container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Chainguard Containers Product Release Lifecycle](https://edu.chainguard.dev/chainguard/chainguard-images/about/versions/)
- [Overview of Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/overview/)
- [Overview of migrating to Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migrations-overview/)
- [Migrating to Python Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migration-guides/migrating-python/)
- [Python Chainguard Container overview](https://images.chainguard.dev/directory/image/python/overview)
- [Python Chainguard Container versions](https://images.chainguard.dev/directory/image/python/versions)
- [Installing APK packages in distroless variants](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/install-apks-in-distroless-variants/)
- [Verifying Chainguard Containers and metadata signatures with Cosign](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/verifying-chainguard-images-and-metadata-signatures-with-cosign/)
- [How to retrieve SBOMs and attestations for Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/retrieve-image-sboms/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [docker image pull reference](https://docs.docker.com/reference/cli/docker/image/pull/)
- [docker image inspect reference](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [docker container run reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [docker buildx build reference](https://docs.docker.com/reference/cli/docker/buildx/build/)

## Issues Found

- The post characterized all three variants solely as package profiles. Chainguard documents that full variants also aim to reproduce upstream environment variables and entrypoint scripts. Updated the introduction, full-variant explanation, and selection table to describe both packages and configuration.
- The first `docker image inspect` example did not pull the image. Because this command inspects the local image store and `latest` is mutable, it could fail when the image was absent or report a stale local build. Added `docker pull "$IMAGE"` before inspection.

## Review Notes

- The Python multi-stage example matches Chainguard's current recommended virtual-environment pattern. Its explicit `ENTRYPOINT` is important because the base Python image otherwise retains `/usr/bin/python` as its entrypoint.
- Chainguard's Directory currently lists `python:latest` and `python:latest-dev` as publicly pullable, while `python:latest-full` requires customer access. This supports the post's warning not to assume every listed tag is anonymously available.
- The Docker CLI flags and Dockerfile instructions used in the post are current. The Chainguard documentation links resolve successfully, including the migration-tips URL through its current redirect.
