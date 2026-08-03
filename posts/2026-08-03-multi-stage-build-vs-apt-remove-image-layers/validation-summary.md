# Validation Summary: Multi-Stage Builds vs. `apt remove`: Why Deleted Tools Stay in Layers

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Docker
- Dockerfiles
- Multi-stage builds
- OCI-style immutable image layers
- BuildKit and Buildx
- Debian Bookworm and APT
- ELF dynamic-dependency inspection tools

## Sources Consulted

- [Docker: Understanding the image layers](https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/)
- [Docker: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker: Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker: Building best practices for `apt-get`](https://docs.docker.com/build/building/best-practices/#apt-get)
- [Docker: Build cache](https://docs.docker.com/build/cache/)
- [Docker: Cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Docker CLI: `docker image history`](https://docs.docker.com/reference/cli/docker/image/history/)
- [Docker CLI: `docker image inspect`](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [Docker CLI: `docker buildx du`](https://docs.docker.com/reference/cli/docker/buildx/du/)
- [Docker Hub: Debian Official Image](https://hub.docker.com/_/debian)
- [Debian: `apt-get(8)` for Bookworm](https://manpages.debian.org/bookworm/apt/apt-get.8.en.html)
- [Debian: `build-essential` package for Bookworm](https://packages.debian.org/bookworm/build-essential)
- [Debian: `ldd(1)` security guidance for Bookworm](https://manpages.debian.org/bookworm/manpages/ldd.1.en.html)

## Issues Found

- The opening description said that registries and hosts still store and transfer lower-layer bytes without acknowledging layer reuse. It now states that a pull transfers the retained layer to a host only when that host does not already have the layer.
- The combined single-stage example could imply that removing `/src` in the combined `RUN` also excludes the copied source from the image. Because `COPY . .` created an earlier immutable layer, those source bytes remain. The explanation now distinguishes files created and deleted within the `RUN` from source introduced by the earlier `COPY` layer.
- The combined single-stage Dockerfile omitted an `ENTRYPOINT`, so it would not start the installed service by default. It now declares the same exec-form service entrypoint as the other examples.

## Review Notes

- The Docker commands and flags were cross-checked against the current official CLI references and local Docker CLI 29.4.3 help output.
- All three Dockerfile snippets passed `docker build --check` with no warnings.
- The `make service` target and resulting `./build/service` path are intentionally application-specific placeholders; a real build context must provide them.
- The post correctly warns that runtime shared-library requirements must be inventoried and that `ldd` should only be used with trusted binaries.
