# Validation Summary: How to Manage Docker Configs in Portainer on Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Swarm
- Docker CLI
- Docker configs
- Docker secrets
- Docker services
- Portainer Community Edition
- Portainer service webhooks

## Sources Consulted
- Docker Docs: `docker swarm init` - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs: Create a swarm - https://docs.docker.com/engine/swarm/swarm-tutorial/create-swarm/
- Docker Docs: `docker service create` - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: `docker service update` - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: `docker service rollback` - https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker Docs: `docker service scale` - https://docs.docker.com/reference/cli/docker/service/scale/
- Docker Docs: `docker service logs` - https://docs.docker.com/reference/cli/docker/service/logs/
- Docker Docs: Store configuration data using Docker Configs - https://docs.docker.com/engine/swarm/configs/
- Docker Docs: `docker config create` - https://docs.docker.com/reference/cli/docker/config/create/
- Docker Docs: Manage sensitive data with Docker secrets - https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: `docker secret create` - https://docs.docker.com/reference/cli/docker/secret/create/
- Docker Docs: `docker node inspect` - https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker Docs: `docker node ps` - https://docs.docker.com/reference/cli/docker/node/ps/
- Portainer Docs: Install Portainer CE with Docker Swarm on Linux - https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer Docs: Services - https://docs.portainer.io/user/docker/services
- Portainer Docs: Configs - https://docs.portainer.io/user/docker/configs
- Portainer Docs: Webhooks - https://docs.portainer.io/user/docker/services/webhooks

## Issues Found
- The Portainer deployment example used an outdated version-pinned download path (`ce2-21`). I updated it to the current official LTS manifest path (`ce-lts`) and aligned the downloaded filename with Portainer's install documentation.
- The `docker service logs` example placed options after the service name. I reordered it to `docker service logs --tail 100 -f myapp` to match documented CLI usage.
- The `docker node ps` example was described as showing node resource usage, but the command actually lists tasks running on a node. I corrected the description.
- The rollback configuration snippet included inline comments after line-continuation backslashes, which would break the shell command. I removed the inline comments and clarified that the flags configure automatic rollback behavior for service updates.

## Review Notes
- Portainer's webhook documentation notes that service webhooks are only available on non-Edge environments.
- The post title emphasizes Portainer config management, but most operational examples use the Docker CLI rather than the Portainer UI. The content is still technically relevant and correct after the fixes above.
