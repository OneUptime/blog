# Validation Summary: How to Fix Podman Build Context Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- Buildah / Containerfile builds
- Dockerfile `COPY` and `ADD`
- `.dockerignore` and `.containerignore`
- Multi-stage container builds
- Compose build configuration

## Sources Consulted
- Podman `podman-build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `.containerignore/.dockerignore` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html#containerignore-dockerignore
- Dockerfile reference for `COPY`, `ADD`, pattern matching, permissions, and `COPY --from`: https://docs.docker.com/reference/dockerfile/
- Docker build context and `.dockerignore` documentation: https://docs.docker.com/build/concepts/context/
- Compose Build Specification: https://compose-spec.github.io/compose-spec/build.html
- Containerfile man page for Podman/Buildah syntax: https://manpages.debian.org/unstable/golang-github-containers-common/containers-containerfile.5.en.html

## Issues Found
- The post repeatedly described Podman as "sending" the local context to the build process. That wording is Docker-daemon-centric and can be misleading for Podman/Buildah local builds, so it was changed to "uses", "processing", and "included in the build context".
- The symlink section incorrectly stated that symlinked files or directories are not included and suggested `--no-cache` as a fix. This was corrected to explain that symlinks do not allow copying target files from outside the build context, and that the fix is to place the real files or symlink targets inside the context.
- The suggested `.dockerignore` debugging command used `grep -v -f .dockerignore`, which does not implement `.dockerignore` syntax such as glob rules, `**`, comments, or negation. It was replaced with a temporary `podman build -f - .` debug build that copies the actual context and lists what made it through ignore processing.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `podman --help` output. The examples using `golang:1.22`, `alpine:3.19`, and `ubuntu:22.04` are syntactically valid, but they are pinned to older image tags; future maintenance could update them to newer base image versions if desired.
