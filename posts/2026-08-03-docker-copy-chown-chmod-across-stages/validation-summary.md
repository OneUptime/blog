# Validation Summary: Set Ownership and Execute Bits Across Stages with `COPY --chown` and `--chmod`

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfiles
- BuildKit and Dockerfile syntax versions
- Multi-stage builds
- `COPY --from`, `COPY --chown`, and `COPY --chmod`
- Linux file ownership and permission modes
- Scratch and distroless runtime images
- Non-root container users
- Go static binaries

## Sources Consulted
- Docker Docs: Dockerfile reference for `COPY --from`, `COPY --chmod`, `COPY --chown`, destination-path creation, and `USER` - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile syntax parser directive and frontend versioning - https://docs.docker.com/build/concepts/dockerfile/#dockerfile-syntax
- Docker Docs: `docker container run` CLI reference for `--entrypoint` and `--rm` - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: `docker container create` CLI reference - https://docs.docker.com/reference/cli/docker/container/create/
- Docker Docs: `docker container export` CLI reference - https://docs.docker.com/reference/cli/docker/container/export/
- Docker Docs: `docker container rm` CLI reference - https://docs.docker.com/reference/cli/docker/container/rm/
- BuildKit Dockerfile frontend 1.10.0 release notes for build-argument interpolation in `--chmod` - https://github.com/moby/buildkit/releases/tag/dockerfile%2F1.10.0
- Go command reference for `go build -o` - https://go.dev/cmd/go/
- Docker Official Image documentation and source for the `golang:1.25-bookworm` tag - https://hub.docker.com/_/golang and https://github.com/docker-library/golang/blob/master/1.25/bookworm/Dockerfile
- Docker Official Image documentation for the `alpine:3.23` tag - https://hub.docker.com/_/alpine
- Docker Official Image documentation and package manifest for `debian:bookworm-slim` - https://hub.docker.com/_/debian and https://raw.githubusercontent.com/debuerreotype/docker-debian-artifacts/2b9b380c71ad8a3b6ce55c083c9ecfb901dabf71/bookworm/slim/rootfs.manifest
- Local Docker 29.4.3 CLI help for `docker run`, `docker create`, `docker export`, and `docker rm`; local Go 1.25.3 behavior check for `go build -o` with a missing parent directory

## Issues Found
No technical issues found.

## Review Notes
The Linux-only behavior of `--chown` and `--chmod`, destination-stage name lookup through `/etc/passwd` and `/etc/group`, numeric-ID behavior, octal modes, symbolic modes beginning with Dockerfile syntax 1.14, and `--chmod` build-argument interpolation beginning with syntax 1.10 all agree with current Docker documentation. The multi-stage and scratch examples use valid numeric `USER` and `COPY` forms, and the referenced Go, Alpine, and Debian image tags are available as of the validation date. Debian's current `bookworm-slim` package manifest includes the account-management and shell-related packages needed by the named-user example. The container creation, export, removal, and entrypoint-override commands match both current Docker documentation and Docker 29.4.3 CLI help. A Docker daemon was not available for a full image build, but the potentially ambiguous `go build -o /out/server` behavior was checked with Go 1.25.3 and correctly creates the missing parent directory.
