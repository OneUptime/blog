# Validation Summary: How to Use Docker SDK with Podman API Compatibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Docker Engine API compatibility
- Docker SDK for Python
- Docker SDK for Go
- Docker Compose
- systemd socket activation

## Sources Consulted
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Docker Engine SDK documentation: https://docs.docker.com/reference/api/engine/sdk/
- Docker SDK for Python client documentation: https://docker-py.readthedocs.io/en/stable/client.html
- Moby Go client package documentation: https://pkg.go.dev/github.com/moby/moby/client
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/

## Issues Found
- The post described Podman's Docker-compatible endpoint as "complete" and implied all existing tooling works without modification. Podman's official documentation describes a compatibility layer for Docker API support, but compatibility is not identical to complete Docker feature parity. I softened the wording to "many existing" tools and "little or no modification."
- The rootful service startup example included a Docker socket path as the primary Podman API socket. Podman's documented rootful default socket is `unix:///run/podman/podman.sock`, so I corrected the command to use that path.
- The systemd socket example defined a standalone custom socket at `/var/run/docker.sock` without a corresponding service unit. Podman's documentation recommends the provided `podman.socket` units, so I replaced the incomplete custom unit with `systemctl` commands for rootful and rootless sockets.
- Several Python `DockerClient` examples omitted `version="auto"` despite the post recommending API version negotiation. I added `version="auto"` to the direct-client examples and test script.
- The Go SDK example used older `github.com/docker/docker/...` imports and the deprecated `NewClientWithOpts` / `WithAPIVersionNegotiation` pattern. Docker's current SDK documentation points to `github.com/moby/moby/client`, where `client.New` negotiates API versions by default, so I updated the import path, client creation, option types, and method signatures.
- The Go example accessed fields directly on newer Moby result wrapper types. I updated `Info` and `ContainerList` usage to access `info.Info` and `containers.Items`.

## Review Notes
- I could not run the Podman or Go examples locally because `podman` and `go` are not installed in this environment. The corrections were verified against official documentation instead.
- Podman's Docker-compatible API currently documents support for Docker API v1.40, while the current Moby client supports a newer maximum API version and negotiates down. Keeping API negotiation enabled is important for this setup.
