# Validation Summary: How to Set Up Service Webhooks in Portainer on Swarm - Set

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer CE
- Docker Swarm mode
- Docker services
- Docker configs
- Docker secrets
- Service webhooks
- CI/CD webhook triggers

## Sources Consulted
- Portainer documentation: Install Portainer CE with Docker Swarm on Linux - https://docs.portainer.io/2.21/start/install-ce/server/swarm/linux
- Portainer documentation: Docker service webhooks - https://docs.portainer.io/user/docker/services/webhooks
- Portainer documentation: Configure service options - https://docs.portainer.io/2.21/user/docker/services/configure
- Docker documentation: Run Docker Engine in swarm mode - https://docs.docker.com/engine/swarm/swarm-mode/
- Docker CLI reference: docker service create - https://docs.docker.com/reference/cli/docker/service/create/
- Docker CLI reference: docker service update - https://docs.docker.com/reference/cli/docker/service/update/
- Docker CLI reference: docker service scale - https://docs.docker.com/reference/cli/docker/service/scale/
- Docker CLI reference: docker service ps - https://docs.docker.com/reference/cli/docker/service/ps/
- Docker CLI reference: docker service logs - https://docs.docker.com/reference/cli/docker/service/logs/
- Docker CLI reference: docker service rollback - https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker CLI reference: docker config create - https://docs.docker.com/reference/cli/docker/config/create/
- Docker CLI reference: docker secret create - https://docs.docker.com/reference/cli/docker/secret/create/
- Docker CLI reference: docker node ls - https://docs.docker.com/reference/cli/docker/node/ls/
- Docker CLI reference: docker node inspect - https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker CLI reference: docker node ps - https://docs.docker.com/reference/cli/docker/node/ps/

## Issues Found
- The comment above `docker node ps <node-id>` said "View node resource usage", but Docker documents `docker node ps` as listing tasks running on one or more nodes. Changed the comment to "View tasks running on a node" so it accurately describes the command.

## Review Notes
The local environment does not have the Docker CLI installed, so command behavior was verified against the official Docker CLI documentation rather than local `--help` output. The Portainer stack manifest URL and OneUptime link both returned HTTP 200 responses when checked on 2026-04-22.
