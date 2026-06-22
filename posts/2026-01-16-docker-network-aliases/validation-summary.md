# Validation Summary: How to Use Docker Network Aliases for Service Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker CLI
- Docker Compose
- Docker embedded DNS
- Service discovery with network aliases
- Traefik labels in Compose examples

## Sources Consulted
- Docker CLI reference: docker container run, including `--network`, `--network-alias`, and user-defined bridge DNS behavior: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference: docker network connect, including `--alias`: https://docs.docker.com/reference/cli/docker/network/connect/
- Docker CLI reference: docker network create: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose services reference, `networks.aliases`: https://docs.docker.com/reference/compose-file/services/#aliases
- Docker Compose Deploy Specification, `deploy.replicas`: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose version and name reference, obsolete top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI help output for Docker 29.4.2 and Docker Compose v5.1.3.

## Issues Found
- The Compose examples used `version: '3.8'`. The Docker Compose Specification keeps the top-level `version` property only for backward compatibility and warns that it is obsolete. Removed the `version` lines from all Compose snippets.
- The switching command used the legacy standalone `docker-compose` command. Updated it to the current Compose plugin command, `docker compose up -d`.
- The post claimed that shared aliases provide round-robin DNS and that requests would round-robin between containers. Docker Compose documentation states that shared aliases are allowed, but the exact container a shared alias resolves to is not guaranteed. Reworded the shared-alias and migration examples to describe DNS-level alias sharing without promising deterministic load balancing.
- The blue-green section described aliases as enabling zero-downtime deployments. Alias switching can support deployment cutovers, but existing connections, DNS caching, and client reconnect behavior affect downtime. Reworded this as deployment cutovers rather than a zero-downtime guarantee.
- The diagram used `172.17.0.5`, which commonly suggests Docker's default bridge network. Since the examples rely on user-defined bridge networks for DNS by container name and alias, changed the illustrative address to `172.18.0.5`, matching Docker's own user-defined bridge examples.
- The summary table described shared aliases as "Load balancing" and blue-green as "Zero-downtime deploys." Updated those labels to "DNS-level service name sharing" and "Deployment cutovers" to match Docker's documented behavior.

## Review Notes
- The `docker network disconnect frontend app-blue` and `docker network connect --alias app frontend app-green` commands are syntactically valid, but in Compose projects the actual network and container names are often project-prefixed. The post now notes that users should use the actual network and container names.
- The testing commands assume a Docker network named `backend` exists. That is correct for a manually created network or a Compose network explicitly named `backend`; otherwise Compose usually creates project-prefixed network names.
