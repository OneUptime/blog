# Validation Summary: How to Implement Service Discovery in Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Compose
- Docker networking
- Docker embedded DNS
- Compose service networks and aliases
- Compose health checks and `depends_on`
- Compose scaling and replicas
- Consul
- Envoy
- NGINX
- PostgreSQL
- Redis

## Sources Consulted
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Docker Engine networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Control startup and shutdown order in Compose - https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: Compose interpolation reference - https://docs.docker.com/reference/compose-file/interpolation/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker compose up` CLI reference - https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Hub: HashiCorp Consul image - https://hub.docker.com/r/hashicorp/consul

## Issues Found
- Removed obsolete top-level `version: '3.8'` entries from Compose examples. Docker Compose now treats the top-level `version` property as obsolete and always validates against the current Compose Specification.
- Updated the scaling command from `docker-compose up -d --scale api=3` to `docker compose up -d --scale api=3` to match the current Docker Compose v2 CLI.
- Fixed the network alias example so it does not set `DATABASE_HOST` three times in the same service. The example now shows one active value and lists the other valid aliases in a comment.
- Qualified the DNS round-robin explanation. Docker DNS can return multiple replica IPs and rotate their order, but actual request distribution depends on client DNS and connection reuse behavior.
- Updated the Consul image from `consul:latest` to `hashicorp/consul:latest`, matching HashiCorp's current Docker Hub guidance.

## Review Notes
The examples remain illustrative and assume application images such as `myapi:latest` expose the ports shown in environment variables and health checks. Fixed host port mappings should still be avoided on services that are scaled to multiple local containers.
