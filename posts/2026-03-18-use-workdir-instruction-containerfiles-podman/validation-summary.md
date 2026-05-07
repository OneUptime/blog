# Validation Summary: How to Use WORKDIR Instruction in Containerfiles for Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Containerfiles / Dockerfile syntax
- Buildah image builds
- Container images

## Sources Consulted
- Podman `run` reference: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Buildah build reference: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker build variables reference: https://docs.docker.com/build/building/variables/

## Issues Found
- The `cd` example under "Why WORKDIR Matters" did not work as written: `/app` was not created first, and the example mixed build-time behavior with a failure explanation that did not accurately isolate the working-directory problem. I replaced it with a `pwd`-based example that correctly demonstrates that `cd` only affects the current `RUN` instruction.
- The runtime example implied that `/` is always the default working directory. I clarified that this is true when the image does not already set `WORKDIR`, which matches the container runtime documentation and avoids overstating the behavior for inherited base images.
- The note about `ARG` was inaccurate. `ARG` values can be used by `WORKDIR` after declaration; the important limitation is that they are build-time only and follow build-stage scoping rules. I updated the text to reflect that behavior.

## Review Notes
None.
