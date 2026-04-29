# Validation Summary: How to Deploy Applications to Low-Bandwidth Edge Sites with Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent Async
- Docker Engine
- Docker Compose
- Prometheus node_exporter
- Redis

## Sources Consulted
- Portainer: Install Edge Agent Async on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer: Add a new Edge Stack - https://docs.portainer.io/user/edge/stacks/add
- Portainer: Edge Groups - https://docs.portainer.io/user/edge/groups
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Prometheus node_exporter README - https://github.com/prometheus/node_exporter/blob/master/README.md

## Issues Found
- The post used the standard Edge Agent tunnel model for a low-bandwidth scenario. I changed the architecture and setup flow to Portainer Edge Agent Async, because Portainer documents async mode as the mode designed for limited or intermittent connectivity and it only requires the Portainer API port rather than the tunnel port.
- The Edge Agent deployment command was incomplete. I added the required `EDGE_ID`, the `/:/host` and `portainer_agent_data:/data` mounts used in Portainer's documented Docker deployment, and replaced `portainer/agent:latest` with a version-matching tag placeholder because Portainer requires the agent version to match the server version.
- The article treated `EDGE_INSECURE_POLL=1` as a default requirement. I changed this to an explicit conditional note because Portainer only documents it for self-signed HTTPS certificates.
- The Portainer UI steps were outdated. I updated the flow to the current `Docker Standalone` -> `Start Wizard` -> `Edge Agent Async` path and added the Portainer API server URL setting that async deployments require.
- The Compose example used the obsolete top-level `version` field and an unreliable `${HOSTNAME}` interpolation for device identity. I removed the obsolete `version` field and changed the device identifier to `${PORTAINER_EDGE_ID}`, which Portainer documents for Edge Stack files.
- The `node-exporter` example used an older image reference and lacked the host-networking guidance from the official container deployment example. I updated it to `quay.io/prometheus/node-exporter:latest`, added `network_mode: host`, and corrected the root bind mount to `ro,rslave`.
- The offline cache example referenced `cache-data` without declaring the volume. I added `cache-data:` to the stack's top-level `volumes` section so the later snippet is valid when applied to the earlier example.
- The update and security wording assumed tunnel-based behavior. I changed the rollout description to reflect async check-in behavior and changed the TLS guidance to focus on the Portainer server certificate instead of an edge tunnel that async mode does not use.

## Review Notes
- Edge Jobs are technically valid here because the post targets Docker-based edge devices, but Portainer currently documents Edge Jobs as a beta feature for Docker Standalone environments that use `/etc/cron.d`.
- Docker's `get.docker.com` script is official and works, but Docker does not recommend the convenience script as the primary production installation path. Distro-specific package installation docs are still the safer long-term option for hardened deployments.
