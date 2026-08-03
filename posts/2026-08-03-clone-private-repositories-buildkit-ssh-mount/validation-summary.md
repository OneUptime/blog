# Validation Summary: Clone Private Repos in Builder Stages Without Leaking SSH Keys

## Status

validated

## Post Type

Technical tutorial and supply-chain security guide

## Technologies Covered

- Docker and Dockerfiles
- Docker BuildKit SSH and secret mounts
- Docker Buildx
- Docker Compose build configuration
- Multi-stage container builds
- OpenSSH agents and host-key verification
- Git shallow fetches and commit pinning
- Alpine Linux 3.23
- Docker build cache, image history, and provenance

## Sources Consulted

- [Docker build secrets and SSH mounts](https://docs.docker.com/build/building/secrets/)
- [Dockerfile reference: `RUN --mount=type=ssh`, `ARG`, `COPY --chmod`, and `ENTRYPOINT`](https://docs.docker.com/reference/dockerfile/)
- [Docker Buildx build reference: `--ssh`, `--build-arg`, `--tag`, and `--load`](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker Compose Build Specification: `ssh` and `args`](https://docs.docker.com/reference/compose-file/build/)
- [Docker build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [Docker cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker build contexts and `.dockerignore`](https://docs.docker.com/build/concepts/context/)
- [Docker image history reference](https://docs.docker.com/reference/cli/docker/image/history/)
- [Git `fetch` documentation](https://git-scm.com/docs/git-fetch)
- [Git glossary: object names and shallow repositories](https://git-scm.com/docs/gitglossary)
- [GitHub's published SSH host-key fingerprints and `known_hosts` entries](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
- [OpenBSD `ssh-keyscan(1)` manual](https://man.openbsd.org/ssh-keyscan)
- [Alpine Linux release branches](https://www.alpinelinux.org/releases/)
- [Alpine Linux package index](https://pkgs.alpinelinux.org/packages)

## Issues Found

- The post originally said that `required=true` makes the build fail immediately whenever the SSH capability is not provided. This was too broad because BuildKit can reuse a cached result for the `RUN` instruction without executing it or requesting the SSH mount. The explanation now says that `required=true` fails the instruction when it has to execute without the capability and explicitly notes the cache-hit behavior.

## Review Notes

- The Dockerfile passed `docker buildx build --check` with no warnings under Docker Buildx 0.33.0.
- The Compose example passed `docker compose config` validation.
- A live BuildKit test confirmed that the SSH agent socket exists during the mounted `RUN`, is absent in the following `RUN`, and that a cached mounted instruction can be reused when a later build omits `--ssh`.
- Alpine 3.23 is a valid, supported image tag. A live Alpine 3.23 container confirmed that `install` is available and that `apk add --no-cache git make openssh-client` installs working Git, Make, and OpenSSH clients.
- A live GitHub test confirmed that the documented `git fetch --depth=1 origin <full-commit>` and detached-checkout sequence works for a full reachable commit ID. The repository URL, commit value, deploy-key path, build output, and service entry point in the post remain illustrative placeholders that readers must replace.
- The 40-character commit example is appropriate for GitHub's current SHA-1 object IDs. Alpine 3.24 is newer, but Alpine 3.23 remains supported through November 2027, so the example is not outdated.
