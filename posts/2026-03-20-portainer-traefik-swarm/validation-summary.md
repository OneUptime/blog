# Validation Summary: How to Deploy Portainer and Traefik Together on Docker Swarm - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Swarm
- Traefik Proxy
- Portainer CE
- Docker overlay networking
- Let's Encrypt / ACME
- Reverse proxy routing with service labels

## Sources Consulted
- Traefik Swarm provider docs: https://doc.traefik.io/traefik/v3.0/providers/swarm/
- Traefik API docs for Docker Swarm dashboard exposure and dummy service port detection: https://doc.traefik.io/traefik/v3.2/operations/api/
- Traefik ACME / Let's Encrypt docs: https://doc.traefik.io/traefik/v3.0/https/acme/
- Portainer CE install docs for Docker Swarm on Linux: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer reverse proxy docs for Traefik on Docker Swarm: https://docs.portainer.io/sts/advanced/reverse-proxy/traefik
- Docker overlay network driver docs: https://docs.docker.com/engine/network/drivers/overlay/
- Docker CLI reference for `docker network create`: https://docs.docker.com/reference/cli/docker/network/create/
- Docker CLI reference for `docker stack deploy`: https://docs.docker.com/reference/cli/docker/stack/deploy/

## Issues Found
- The post required Portainer as a prerequisite while also deploying Portainer in the same stack. I corrected the instructions so the stack is created on a Swarm manager node instead of implying Portainer must already exist.
- The Traefik service was configured as a global service while storing ACME data in a local volume. Traefik's ACME docs state the storage file cannot be shared across multiple instances, so I changed the deployment to a single replicated instance on a manager node.
- The Swarm deployment for Portainer omitted the Portainer Agent, while Portainer's Swarm install guidance uses a Portainer Server plus Agent deployment. I added the `agent` service, the internal agent network, the `9001` prerequisite, and updated the Portainer server command to connect through `tcp://tasks.agent:9001`.
- The Traefik dashboard labels in Swarm mode were adjusted to use the documented dummy service port label required for Swarm port detection when routing to `api@internal`.
- The Portainer server and agent images were aligned to the official `lts` tags so the guide matches Portainer's supported Swarm deployment pattern.

## Review Notes
- The example still exposes the Traefik dashboard publicly without authentication. That is functional but should be protected before using the setup on an internet-facing system.
- The example remains pinned to `traefik:v3.0`. The configuration is valid for Traefik v3, but a future refresh should consider updating the tag to a newer maintained v3 release.
- Docker CLI binaries were not installed in this workspace, so command validation relied on official Docker documentation rather than local `docker --help` output.
