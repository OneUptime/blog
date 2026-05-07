# Validation Summary: How to Use None Network Mode with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container networking
- Linux network namespaces
- Podman volumes
- Container security options
- Alpine Linux
- OpenSSL

## Sources Consulted
- Podman `podman-run(1)` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-network(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-network.1.html
- Podman `podman-network-create(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-network-create.1.html

## Issues Found
- The cryptographic operations example used `apk add --no-cache openssl` inside a container started with `--network none`. That command needs repository access unless the package is already locally available, so it contradicts the no-network setup. Changed the example to use the `docker.io/alpine/openssl:latest` image, which includes OpenSSL.
- The comparison table said DNS resolution is available on an internal network. Podman's internal network behavior is more limited: with Netavark/aardvark-dns, internal networks resolve container names while other queries return `NXDOMAIN`; with the CNI backend, DNS is automatically disabled for internal networks. Updated the table to say "Container names only."

## Review Notes
Podman is not installed in this workspace, so command behavior was verified against the current official Podman manpages rather than local CLI execution. The examples assume referenced host paths, named volumes, and prebuilt images already exist.
