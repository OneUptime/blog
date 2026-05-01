# Validation Summary: How to Configure Docker Buildx with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Buildx
- BuildKit
- Docker Engine networking
- IPv6
- Dockerfile build networking
- Registry and local build cache

## Sources Consulted
- Docker Build overview: https://docs.docker.com/build/concepts/overview/
- `docker buildx create` CLI reference: https://docs.docker.com/reference/cli/docker/buildx/create/
- `docker buildx build` CLI reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- `docker buildx inspect` CLI reference: https://docs.docker.com/reference/cli/docker/buildx/inspect/
- Docker container driver docs: https://docs.docker.com/build/builders/drivers/docker-container/
- Remote driver docs: https://docs.docker.com/build/builders/drivers/remote/
- BuildKit configuration docs: https://docs.docker.com/build/buildkit/configure/
- `buildkitd.toml` reference: https://docs.docker.com/build/buildkit/toml-configuration/
- Dockerfile reference (`RUN --network` and entitlements): https://docs.docker.com/reference/builder
- Docker IPv6 networking docs: https://docs.docker.com/engine/daemon/ipv6/
- Distribution reference syntax for IPv6 registry hosts: https://github.com/distribution/reference/blob/main/regexp.go

## Issues Found
- The post said the default builder uses host networking for build containers. Docker's default builder uses the `docker` driver backed by the Docker Engine's bundled BuildKit, so I corrected that explanation and kept the custom `docker-container` builder for configurable networking.
- The host-network build examples were missing the required `network.host` entitlement. I added `--buildkitd-flags '--allow-insecure-entitlement network.host'` on builder creation, `insecure-entitlements = ["network.host"]` in `buildkitd.toml`, and `--allow network.host` on build commands that use `--network=host`.
- Several single-platform builds used the `docker-container` or `remote` driver without `--load` or `--push`. Per Docker docs, those drivers do not automatically load images into the local image store, so I added `--load` where appropriate.
- The post used `docker buildx build --network=build-net`, but Buildx only documents `default`, `none`, and `host` for `--network`. I changed the example to attach the `docker-container` builder itself to the IPv6-enabled Docker network with `--driver-opt network=build-net`.
- The subnet `fd00:build::/64` was not a valid IPv6 prefix because `build` is not hexadecimal. I replaced it with the valid ULA subnet `fd00:100::/64`.
- The BuildKit section started a standalone `buildkitd` process without showing how Buildx connects to it, and it used undocumented `env.BUILDKIT_NETWORK=host`. I corrected this to either use `--buildkitd-config` with a managed `docker-container` builder or connect to a manually started daemon with the `remote` driver.

## Review Notes
- Docker Engine's documented IPv6 networking support is for Linux hosts. Readers using Docker Desktop may still use these patterns, but the networking ultimately runs inside Docker's Linux VM.
- `--load` only applies to single-platform outputs, which matches the corrected examples. The multi-platform example correctly uses `--push`.
