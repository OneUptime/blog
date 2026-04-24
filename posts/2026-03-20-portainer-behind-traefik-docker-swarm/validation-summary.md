# Validation Summary: How to Set Up Portainer Behind Traefik on Docker Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Swarm
- Traefik v3
- Portainer CE
- Docker Compose stack files
- Let's Encrypt / ACME
- Docker overlay networking

## Sources Consulted
- Traefik v2 to v3 migration details: https://doc.traefik.io/traefik/migrate/v2-to-v3-details/
- Traefik Swarm provider reference: https://doc.traefik.io/traefik/v3.0/providers/swarm/
- Traefik Swarm routing reference: https://doc.traefik.io/traefik/v3.3/routing/providers/swarm/
- Traefik Swarm setup guide: https://doc.traefik.io/traefik/v3.4/setup/swarm/
- Docker stack deploy docs: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker overlay network driver docs: https://docs.docker.com/engine/network/drivers/overlay/
- Docker network create CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy docs: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer official issue documenting `--trusted-origins`: https://github.com/portainer/portainer/issues/12748

## Issues Found
- The post used Traefik v2-style Swarm configuration (`--providers.docker.swarmMode=true`) even though the example targeted Traefik v3. I replaced this with the dedicated `--providers.swarm.*` configuration that Traefik v3 requires.
- The original network configuration was inconsistent for `docker stack deploy`: stack-managed networks are prefixed with the stack name, but the Traefik config expected an unprefixed network called `proxy`. I changed the guide to create `proxy` ahead of time as an attachable overlay network and reference it as an external network in the stack.
- The Portainer `--trusted-origins` example used `https://portainer.example.com`. Current Portainer guidance documents this setting as domain-based; I corrected it to `portainer.example.com`.
- The opening prerequisites implied the domain should point to a manager node specifically. I corrected this to the node or load balancer serving Traefik, which is the technically accurate requirement.

## Review Notes
- Docker is not installed in this review environment, so command syntax and behavior were validated against official documentation rather than executed locally.
- The example keeps a single Traefik replica with ACME data in a Docker volume. If you later allow Traefik to move between manager nodes, shared storage for `/letsencrypt` is advisable so certificates persist across rescheduling.
