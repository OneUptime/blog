# Validation Summary: How to Deploy a Stack on Docker Swarm via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Swarm
- Docker stack / legacy Compose v3 stack files
- Traefik v2.10
- Docker secrets
- PostgreSQL official image
- Redis official image

## Sources Consulted
- Portainer Documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Documentation, "Cluster visualizer": https://docs.portainer.io/user/docker/swarm/cluster-visualizer
- Docker Docs, "`docker stack deploy`" CLI reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs, "Deploy a stack to a swarm": https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, "Compose Deploy Specification": https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs, "How Compose works": https://docs.docker.com/compose/intro/compose-application-model/
- Docker Docs, "Services" reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "Manage secrets securely in Docker Compose": https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Docs, "Configs top-level element": https://docs.docker.com/reference/compose-file/configs/
- Docker Docs, "`docker secret create`" CLI reference: https://docs.docker.com/reference/cli/docker/secret/create/
- Traefik v2.10 Documentation, "Docker provider": https://doc.traefik.io/traefik/v2.10/providers/docker/
- Traefik v2.10 Documentation, "Routing configuration with Docker labels": https://doc.traefik.io/traefik/v2.10/routing/providers/docker/
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres?tab=tags
- Redis Docker Official Image documentation: https://hub.docker.com/_/redis?tab=tags

## Issues Found
- The Traefik labels for the `frontend` service were defined at the service root, but in Docker Swarm Traefik reads labels from the Swarm service, so they need to be under `deploy.labels`. I moved the labels into `deploy.labels` to match Traefik's Swarm documentation.
- The example did not attach the `traefik` service to `public-net`, so the reverse proxy would not have a shared overlay network with the `frontend` service. I added `public-net` to the Traefik service.
- The `frontend` service was attached to multiple networks without an explicit Traefik network selection. Traefik's documentation warns it can randomly choose the wrong network in that case, and that stack-created network names are prefixed with the stack name. I added `traefik.docker.network=my-production-app_public-net` and clarified the reason inline.
- The comment `# One Traefik per node` was inaccurate because the placement constraint limits Traefik to manager nodes. I corrected the comment to `# One Traefik on each manager node`.
- The secret creation commands used `echo`, which appends a trailing newline to the secret payload. I changed them to `printf %s` so the stored secret values are exact.
- The prerequisite wording now explicitly says the guide uses the legacy Compose v3 syntax required by `docker stack deploy`, which is more precise than the previous wording.
- The comparison table between Swarm and standalone stacks overstated the limitations of standalone stacks. I adjusted the wording so it remains directional but no longer claims standalone stacks are always single-container or have no service concept at all.
- The Portainer UI references were tightened to match current documentation terminology: `Add stack` and `Cluster visualizer`.

## Review Notes
- The Traefik example is pinned to `traefik:v2.10`, and the configuration shown is correct for Traefik v2.10. Traefik v3 separates Swarm support into a dedicated Swarm provider, so readers should not switch this example to `traefik:latest` without updating the configuration accordingly.
- The PostgreSQL and Redis services use local named volumes with a single replica each. That is valid for simple single-instance stateful services in Swarm, but the data remains tied to the node that owns each local volume.
