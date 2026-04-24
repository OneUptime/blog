# Validation Summary: How to Install Portainer on a Docker Swarm Cluster - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Community Edition (CE)
- Docker Engine
- Docker Swarm
- Docker CLI
- YAML stack manifests
- NFS-backed Docker volumes

## Sources Consulted
- Portainer CE install on Docker Swarm (Linux): https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer initial setup: https://docs.portainer.io/start/install-ce/server/setup
- Portainer updates on Docker Swarm: https://docs.portainer.io/start/upgrade/swarm
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer architecture: https://docs.portainer.io/start/architecture
- Portainer FAQ on retaining configuration in Docker Swarm: https://docs.portainer.io/2.33-lts/faqs/installing/how-can-i-ensure-portainers-configuration-is-retained
- Official Portainer LTS Swarm stack manifest: https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml
- Docker CLI reference for `docker swarm init`: https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker CLI reference for `docker node ls`: https://docs.docker.com/reference/cli/docker/node/ls/
- Docker Swarm node management guide: https://docs.docker.com/engine/swarm/manage-nodes/

## Issues Found
- The guide downloaded an outdated version-specific Portainer stack manifest from `ce2-21`. I updated it to the current LTS manifest URL and aligned the manual stack example and expected output to `:lts`, matching current Portainer documentation.
- The worker-node section used `docker node ls` as though it could be run there. Docker documents `docker node ls` as a manager-only cluster management command, so I corrected the note to run that verification from a manager node.
- The prerequisites omitted TCP port `9001` between manager and worker nodes, which Portainer requires for Agent communication. I added that requirement.
- The prerequisites pinned Docker to `20.10+`, which is an outdated baseline relative to Portainer's current validated configuration matrix. I changed this to require a current Docker Engine installation instead of preserving an outdated fixed minimum.
- The Portainer UI path was listed as `Settings → Environments`, which does not match the current navigation. I corrected it to `Environments`.
- The upgrade section updated only the Portainer Server image and used `:latest`. Portainer's update guidance requires the Server and Agent versions to stay aligned, so I updated the commands to keep both services on matching `:lts` tags and refreshed the redeploy example accordingly.
- The persistent storage explanation assumed a single-manager placement model. Portainer documents that, on multi-manager swarms, updates can move the Portainer service and make it appear as a fresh install unless you pin it to the manager holding the data or use shared storage. I clarified that behavior.
- The troubleshooting comment said `docker service logs portainer_agent` checks logs on a specific node. That command shows service-level logs, so I corrected the wording.

## Review Notes
- The default Portainer Swarm manifest still publishes ports `9443`, `9000`, and `8000`. `9443` is the primary HTTPS UI, `9000` is retained for legacy HTTP access, and `8000` is used for the tunnel server. The post now states that these ports must be available when using the default manifest.
- The manual stack file remains Linux-specific because it uses Linux host paths and a Linux node placement constraint, which matches the linked Portainer Linux installation flow.
