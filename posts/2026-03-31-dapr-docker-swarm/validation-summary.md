# Validation Summary: How to Use Dapr with Docker Swarm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (self-hosted mode, daprd runtime, component configuration)
- Docker Swarm (stack deploy, overlay networks, service discovery)
- Docker (multi-stage builds, Dockerfile)
- Redis (state store, pub/sub backing service)

## Sources Consulted
- Dapr CLI install script and `dapr init --slim` behavior: https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Dapr daprd runtime arguments reference (--app-id, --app-port, --dapr-http-port, --resources-path): https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr component schema (apiVersion, kind, spec format): https://docs.dapr.io/reference/component-schema/
- Dapr Redis state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr name resolution overview (mDNS default in self-hosted): https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Docker Swarm overlay network documentation: https://docs.docker.com/network/drivers/overlay/
- Docker stack deploy CLI reference: https://docs.docker.com/reference/cli/docker/stack/deploy/

## Issues Found

1. **`daprd` binary not in PATH (start.sh)**: The start.sh script called `daprd` directly, but after `dapr init --slim` the runtime binary is placed at `~/.dapr/bin/daprd`, which is not in the system PATH. The `dapr` CLI (installed to `/usr/local/bin/`) knows where to find it, but invoking `daprd` directly would fail with "command not found". Fixed by changing `daprd` to `/root/.dapr/bin/daprd` (the container runs as root).

2. **Deprecated `--components-path` flag**: The `--components-path` flag for `daprd` was deprecated in Dapr 1.10 in favor of `--resources-path`. While the old flag still works for backward compatibility, the post should use the current flag. Fixed by changing `--components-path` to `--resources-path` in start.sh.

## Review Notes

- **mDNS limitations on Docker Swarm**: The "Service Discovery in Swarm" section shows Dapr service invocation (`/v1.0/invoke/payment-service/method/pay`) which relies on Dapr's name resolution. In self-hosted mode, Dapr uses mDNS by default. mDNS requires multicast UDP which does not reliably traverse Docker Swarm overlay networks across multiple nodes. For multi-node Swarm deployments, users would need to configure an alternative name resolution component such as HashiCorp Consul. The example would work on a single-node Swarm but may fail in multi-node clusters. This is a significant caveat that readers should be aware of, though the post does acknowledge limitations vs Kubernetes in a later section.
- **Debian Bullseye base image**: The Dockerfile uses `debian:bullseye-slim` (Debian 11). Debian 12 (Bookworm) is the current stable release. Not technically wrong but readers may prefer using the newer base image.
- **Docker Compose version field**: The `version: "3.9"` field in the stack file is considered obsolete by newer Docker Compose versions, but remains valid and commonly used for Docker Swarm stack deploys.
