# Validation Summary: How to Understand the Docker Client-Server Architecture

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker daemon (`dockerd`)
- Docker Engine API
- Unix sockets
- Docker remote daemon access
- Docker contexts
- Docker daemon JSON configuration
- Docker SDK for Python
- Docker SDK for Go
- containerd
- runc

## Sources Consulted
- Docker Engine overview: https://docs.docker.com/engine/
- Docker client/server architecture note in `docker version` docs: https://docs.docker.com/reference/cli/docker/version/
- Docker Engine API reference and version matrix: https://docs.docker.com/reference/api/engine/
- Docker Engine SDK docs: https://docs.docker.com/reference/api/engine/sdk/
- Docker Engine SDK examples: https://docs.docker.com/reference/api/engine/sdk/examples/
- Docker daemon remote access docs: https://docs.docker.com/engine/daemon/remote-access/
- Docker daemon CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Protect Docker daemon socket docs: https://docs.docker.com/engine/security/protect-access/
- Docker `run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker `context create` CLI reference and local `docker context create --help`
- Local `docker --help`, `docker info --help`, and `dockerd --help` output

## Issues Found
- The remote TCP example used port `2376` without TLS. Changed the non-TLS `DOCKER_HOST` example to port `2375`, matching Docker's documented convention that `2376` is the default TLS port.
- The `daemon.json` snippets contained `//` comments inside `json` code fences. Removed the comments because Docker daemon configuration files are JSON and comments are invalid.
- The remote daemon configuration section did not mention the documented conflict between `hosts` in `daemon.json` and `-H` flags in a systemd unit. Added a concise caveat.
- The staging Docker context example used a TLS port without TLS certificate options. Added the same `ca`, `cert`, and `key` options shown for the production context.
- The client-side debug section used `DOCKER_CLI_EXPERIMENTAL=enabled`, which is deprecated and does not enable normal CLI debug output. Replaced it with the documented `-D` shorthand for `--debug`.
- The Go SDK example used the older `github.com/docker/docker` import path and old `types.ContainerListOptions` shape. Updated it to the current official `github.com/moby/moby/client` usage and `containers.Items` response shape from Docker's SDK docs.
- The post said the full `docker run` chain happens in milliseconds. Reworded that claim because image pulls can take much longer depending on network speed and image size.

## Review Notes
- The `curl` examples use Docker Engine API `v1.44`. Docker's current docs show newer API versions, but `v1.44` remains within the supported range for current Docker Engine releases, so the examples are still valid.
- The post's high-level architecture explanation is accurate, but the exact daemon/containerd/runc call sequence is intentionally simplified for a beginner guide.
