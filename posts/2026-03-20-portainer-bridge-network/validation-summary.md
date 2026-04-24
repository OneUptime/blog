# Validation Summary: How to Create a Bridge Network in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker bridge networks
- Docker CLI
- Docker Compose

## Sources Consulted
- Docker Docs, Bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs, `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs, Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Define and manage networks in Docker Compose: https://docs.docker.com/reference/compose-file/networks/
- Portainer Docs, Add a new network: https://docs.portainer.io/user/docker/networks/add
- Portainer Docs, Networks overview: https://docs.portainer.io/sts/user/docker/networks

## Issues Found
- The Compose example used the top-level `version: "3.8"` field, which Docker now marks as obsolete. I removed it so the example matches the current Compose Specification behavior.
- The post described `com.docker.network.bridge.enable_icc=false` as an "isolated network" example. That option disables inter-container connectivity, but Docker's external isolation model is `--internal` / `internal: true`. I rewrote the example label to describe it accurately.
- The Portainer steps for attaching an existing container omitted the requirement to enable **Manual container attachment** when creating the network. I added that requirement where the network is created and where the later attachment step is described.
- The DNS comparison for the default bridge was oversimplified. I updated it to note that the default bridge has no automatic DNS resolution and that `--link` is the legacy exception.
- Several statements about "always" using custom bridge networks or `internal` meaning "no internet access" were broader than the official docs. I narrowed them to Docker's current terminology: prefer user-defined bridges over the default bridge for same-host container communication, and describe `internal` networks as externally isolated.
- The original name-resolution example used `docker exec nginx curl ...`, which depends on tooling being present inside the target container image. I replaced it with a network-scoped `busybox ping` example that better matches the behavior being demonstrated.

## Review Notes
- The post is now technically accurate for current Docker Engine and Docker Compose documentation as of April 24, 2026.
- `docker-compose.yml` remains a valid filename, but Docker's current documentation is centered on the Compose Specification rather than numbered file-format versions.
