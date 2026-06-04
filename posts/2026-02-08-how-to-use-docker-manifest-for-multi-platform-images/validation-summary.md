# Validation Summary: How to Use docker manifest for Multi-Platform Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker manifest lists / OCI image indexes
- Multi-platform Docker images
- Docker Buildx
- GitHub Actions
- QEMU/binfmt emulation
- Container registries
- jq

## Sources Consulted
- Docker CLI reference: docker manifest: https://docs.docker.com/reference/cli/docker/manifest/
- Docker CLI reference: docker buildx build: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker CLI reference: docker image pull: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker CLI reference: Docker CLI configuration and experimental features: https://docs.docker.com/reference/cli/docker/
- Docker Build documentation: Multi-platform builds: https://docs.docker.com/build/building/multi-platform/
- Docker Build documentation: Multi-platform image with GitHub Actions: https://docs.docker.com/build/ci/github-actions/multi-platform/
- GitHub Docs: GitHub-hosted runners reference: https://docs.github.com/en/actions/reference/github-hosted-runners-reference
- Local Docker CLI help output for `docker manifest`, `docker manifest create`, `docker manifest annotate`, `docker manifest push`, `docker manifest rm`, `docker build`, `docker pull`, and `docker inspect`.

## Issues Found
- The post said the registry checks the manifest list and returns the correct platform image. Docker's documented behavior is that the registry returns the manifest list/image index and Docker selects the matching variant based on the host platform. Updated the explanation and Mermaid diagram accordingly.
- The post described manifest lists as pointing directly to platform-specific images. Updated the wording to platform-specific image manifests, matching Docker's manifest list model.
- The enabling section said users need to enable experimental CLI features in Docker configuration. Docker documents that experimental CLI features are enabled by default starting with Docker 20.10, though `docker manifest` is still marked experimental. Updated the section to make the extra configuration apply only to older CLIs.
- The config snippet overwrote `~/.docker/config.json`, which can destroy existing Docker CLI configuration and credentials. Replaced it with guidance to add the `experimental` key to the existing config if needed.
- The quick jq command used `docker manifest inspect --verbose`, whose output shape is an array of descriptors and can include non-platform attestation entries with `unknown` platform values. Changed it to inspect the non-verbose manifest list and filter unknown entries.
- The workflow introduction said there were three steps, but the section lists four steps. Corrected the count.
- The GitHub Actions matrix example built `linux/arm64` on `ubuntu-latest` without setting up QEMU or using a native ARM runner. Added `docker/setup-qemu-action@v4` for non-amd64 matrix entries.

## Review Notes
The remaining commands and flags were verified against Docker's official CLI documentation and local CLI help. The examples assume the user is authenticated to the target registry and that the builder environment supports the requested platform builds.
