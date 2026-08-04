# Validation Summary: Docker `VOLUME`: Why Build Files Differ Between Legacy Builder and BuildKit

## Status
validated

## Post Type
Technical guide and troubleshooting reference

## Technologies Covered
- Docker Engine
- Dockerfile `VOLUME`
- Docker BuildKit
- Docker legacy builder
- Docker bind mounts and volumes
- Dockerfile `RUN --mount=type=cache`
- Multi-stage Docker builds
- Alpine Linux 3.23

## Sources Consulted
- Docker Docs: Dockerfile reference for `VOLUME`, `RUN --mount`, and multi-stage `COPY` - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Volumes, mount obscuring, empty-volume initialization, and `volume-nocopy` - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Bind mounts, obscuring existing container data, and `--mount` syntax - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Legacy `docker build` behavior and deprecation status - https://docs.docker.com/reference/cli/docker/image/build/
- Docker Docs: Deprecated Docker Engine features - https://docs.docker.com/engine/deprecated/
- Docker Docs: `docker buildx ls` behavior - https://docs.docker.com/reference/cli/docker/buildx/ls/
- Docker Docs: `docker image inspect` - https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker Docs: `docker inspect` and Go-template formatting - https://docs.docker.com/reference/cli/docker/inspect/ and https://docs.docker.com/engine/cli/formatting/
- Docker Docs: `docker run` mount and `--rm` behavior - https://docs.docker.com/reference/cli/docker/container/run/
- Alpine Linux: Alpine 3.23 release announcement and supported release branches - https://www.alpinelinux.org/posts/Alpine-3.23.0-released.html and https://www.alpinelinux.org/releases/

## Issues Found
- The runtime example used an empty bind-mounted host directory, but the surrounding text said the bind mount had to be non-empty. Empty bind mounts also obscure image content. Changed the text to distinguish any bind mount from a non-empty Docker-managed volume, because an empty Docker-managed volume is populated from the container directory by default.
- The post said removing a mount reveals the image files. Docker does not provide a straightforward way to remove a mount from an existing container. Changed the instruction to recreate the container without the mount.
- The multi-stage example invoked an undefined `./generate-defaults` executable and could not run as shown. Replaced it with a self-contained `printf` command that creates the sample JSON seed file.
- The diagnostic checklist implied that `docker buildx ls` identifies which builder produced an existing image. That command lists configured builder instances and marks the current builder; it does not establish the provenance of an already-built image. Updated the step to use it for the current BuildKit selection and to use CI configuration and build logs to identify the producing backend.

## Review Notes
The central legacy-builder versus BuildKit distinction is documented exactly as described: legacy builder discards changes made under a declared volume path by later build steps, while BuildKit retains them. The legacy builder for Linux images is deprecated, and current Docker documentation treats it primarily as relevant to Windows-container builds. The `DOCKER_BUILDKIT=0` reproduction therefore depends on an installation that still provides the legacy backend. Alpine 3.23 is a valid, supported release at the validation date. The Docker daemon was not running in the review environment, so runtime reproduction was verified from current official documentation and CLI syntax rather than by executing the builds.
