# Validation Summary: How to Create a Custom Network with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container networking
- Bridge networks
- DNS-based container discovery
- Network aliases

## Sources Consulted
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman network connect` documentation: https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- Podman `podman network inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Official Docker Library `node:20` and `alpine:latest` images inspected locally with Docker for availability of `ping` and `nslookup`.

## Issues Found
- The `api` container used `docker.io/library/node:20`, but the current official `node:20` image does not include `ping` or `nslookup`. The post later runs both commands from that container, so those examples would fail. Changed the `api` container image to `docker.io/library/alpine:latest`, which includes BusyBox `ping` and `nslookup`.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against current official Podman documentation rather than local `podman --help` output. The commands and flags for `podman network create`, `podman network inspect`, `podman run --network`, `--network-alias`, `podman network connect`, `podman network rm`, and `podman network prune` match the documented interfaces. Internal network behavior is accurate for bridge networks; current Podman documentation notes that internal networks prevent a default route and restrict external access, while Aardvark DNS still resolves container names and returns `NXDOMAIN` for other queries.
