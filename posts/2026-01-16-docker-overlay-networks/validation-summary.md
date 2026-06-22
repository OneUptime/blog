# Validation Summary: How to Set Up Docker Overlay Networks for Multi-Host Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker Swarm mode
- Docker overlay networks
- Docker Compose / Docker Stack files
- VXLAN overlay networking
- Docker ingress routing mesh
- Docker Macvlan networks
- Traefik v2 Docker Swarm provider

## Sources Consulted
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Manage Swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Use Swarm mode routing mesh - https://docs.docker.com/engine/swarm/ingress/
- Docker Docs: docker network create CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: docker service create CLI reference - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: Docker Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Traefik Docs: Docker provider / Swarm mode for Traefik v2 - https://doc.traefik.io/traefik/v2.1/providers/docker/
- Traefik Docs: v2 to v3 migration details for Docker Swarm provider changes - https://doc.traefik.io/traefik/migrate/v2-to-v3-details/

## Issues Found
- The custom ingress network example created a second ingress network without first removing the default `ingress` network. Docker allows only one ingress network at a time, and it can only be removed when no services depend on it. Added `docker network rm ingress` and a comment to stop services that publish ports first.
- The comparison table stated that Macvlan has no multi-host capability. Docker supports swarm-scoped local-scope drivers, including Macvlan, with per-node configuration, although it is not equivalent to overlay networking. Changed the table to describe Macvlan multi-host support as limited to same-L2 / swarm-scope scenarios.
- The comparison table described overlay external LAN access only as "Via ingress". Changed it to "Via published ports/ingress" to match Docker Swarm routing mesh behavior more precisely.

## Review Notes
- Docker Compose `version: '3.8'` remains accepted for `docker stack deploy`, though the newer Compose Specification treats the top-level `version` field as obsolete for regular `docker compose` workflows.
- The Traefik example pins `traefik:v2.10`, where `--providers.docker.swarmMode=true` is valid. This option was removed in Traefik v3, so upgrading the image to v3 would require switching to the Swarm provider syntax.
- Encrypted overlay networks are supported on Linux, but Docker documents a performance cost and notes that encrypted overlay networking is not supported for Windows containers.
