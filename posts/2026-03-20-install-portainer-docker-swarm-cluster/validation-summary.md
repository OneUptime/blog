# Validation Summary: How to Install Portainer on a Docker Swarm Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker Swarm
- Docker CLI
- Docker services, stacks, configs, secrets, and nodes

## Sources Consulted
- Portainer CE Swarm installation docs: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer service webhook docs: https://docs.portainer.io/user/docker/services/webhooks
- Portainer service creation docs: https://docs.portainer.io/user/docker/services/add
- Docker Swarm join nodes docs: https://docs.docker.com/engine/swarm/join-nodes/
- Docker `swarm init` reference: https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker `swarm join-token` reference: https://docs.docker.com/reference/cli/docker/swarm/join-token/
- Docker `stack deploy` reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker `service create` reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker `service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker `service rollback` reference: https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker `service logs` reference: https://docs.docker.com/reference/cli/docker/service/logs/
- Docker `node inspect` reference: https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker `node ps` reference: https://docs.docker.com/reference/cli/docker/node/ps/
- Docker configs docs: https://docs.docker.com/engine/swarm/configs/
- Docker `secret create` reference: https://docs.docker.com/reference/cli/docker/secret/create/

## Issues Found
- The Portainer install snippet used an old version-pinned download path (`ce2-21`). I changed it to the current LTS manifest path (`ce-lts`) to match Portainer's current CE Swarm installation docs.
- The post said `docker node ps` shows node resource usage. I corrected the description because the command actually lists tasks scheduled on a node; resource details come from `docker node inspect --pretty`.
- The service logs example implied universal support. I updated the note to reflect Docker's documented limitation that `docker service logs` works for services using the `json-file` or `journald` logging driver.

## Review Notes
- The post is technically relevant and includes valid Docker Swarm and Portainer examples after the corrections above.
- Docker Swarm cluster-management commands such as `docker stack deploy`, `docker service ...`, and `docker node ...` must be run from a swarm manager node.
- Portainer's current official CE Docker Swarm install docs are published under the 2.39 LTS documentation set and default to HTTPS on port `9443`.
