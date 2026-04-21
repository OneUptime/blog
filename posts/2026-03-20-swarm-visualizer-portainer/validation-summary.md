# Validation Summary: How to Use the Swarm Visualizer in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Portainer CE
- Docker Swarm mode
- Docker services
- Docker configs and secrets
- Portainer Cluster visualizer
- Portainer service webhooks

## Sources Consulted
- Portainer documentation: Install Portainer CE with Docker Swarm on Linux - https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer documentation: Cluster visualizer - https://docs.portainer.io/user/docker/swarm/cluster-visualizer
- Portainer documentation: Services and webhooks - https://docs.portainer.io/user/docker/services and https://docs.portainer.io/user/docker/services/webhooks
- Docker documentation: Swarm mode overview and key concepts - https://docs.docker.com/engine/swarm/ and https://docs.docker.com/engine/swarm/key-concepts/
- Docker CLI reference: docker service create - https://docs.docker.com/reference/cli/docker/service/create/
- Docker CLI reference: docker service update - https://docs.docker.com/reference/cli/docker/service/update/
- Docker CLI reference: docker service rollback - https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker CLI reference: docker service scale, ps, and logs - https://docs.docker.com/reference/cli/docker/service/scale/, https://docs.docker.com/reference/cli/docker/service/ps/, and https://docs.docker.com/reference/cli/docker/service/logs/
- Docker CLI reference: docker node inspect and ps - https://docs.docker.com/reference/cli/docker/node/inspect/ and https://docs.docker.com/reference/cli/docker/node/ps/
- Docker CLI reference: docker config create and docker secret create - https://docs.docker.com/reference/cli/docker/config/create/ and https://docs.docker.com/reference/cli/docker/secret/create/

## Issues Found
- The Portainer Swarm deployment command used the old `ce2-21` manifest URL. Updated it to the current official CE LTS manifest URL, `https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml`, and adjusted the downloaded filename used by `docker stack deploy`.
- The rollback configuration example placed inline comments after shell continuation backslashes. In Bash, this prevents the backslash from continuing the command correctly. Removed the inline comments so the command is syntactically valid.
- The comment above `docker node ps <node-id>` described the command as viewing node resource usage. The Docker CLI reference defines `docker node ps` as listing tasks on one or more nodes, so the comment was changed to "View tasks running on a node."

## Review Notes
Portainer's current documentation names the visual feature "Cluster visualizer" under Swarm. The post title uses "Swarm Visualizer" descriptively, which is understandable, but a future content pass could align the terminology and add explicit navigation to Swarm > Cluster visualizer.
