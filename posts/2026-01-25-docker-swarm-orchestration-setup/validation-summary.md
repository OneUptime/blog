# Validation Summary: How to Set Up Docker Swarm for Orchestration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Swarm mode
- Docker services
- Docker stacks
- Compose file syntax for Swarm stacks
- Overlay networking and ingress routing mesh
- Docker secrets and configs
- Swarm node management, backups, and restores

## Sources Consulted
- Docker Docs: Swarm mode overview: https://docs.docker.com/engine/swarm/
- Docker Docs: Create a swarm: https://docs.docker.com/engine/swarm/swarm-tutorial/create-swarm/
- Docker Docs: How nodes work: https://docs.docker.com/engine/swarm/how-swarm-mode-works/nodes/
- Docker Docs: Raft consensus in swarm mode: https://docs.docker.com/engine/swarm/raft/
- Docker Docs: Deploy services to a swarm: https://docs.docker.com/engine/swarm/services/
- Docker CLI reference: docker service create: https://docs.docker.com/reference/cli/docker/service/create/
- Docker CLI reference: docker service update: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: Deploy a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: Manage swarm service networks: https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Use Swarm mode routing mesh: https://docs.docker.com/engine/swarm/ingress/
- Docker Docs: Manage nodes in a swarm: https://docs.docker.com/engine/swarm/manage-nodes/
- Docker Docs: Manage sensitive data with Docker secrets: https://docs.docker.com/engine/swarm/secrets/
- Docker Docs: Store configuration data using Docker configs: https://docs.docker.com/engine/swarm/configs/
- Docker Docs: Administer and maintain a swarm of Docker Engines: https://docs.docker.com/engine/swarm/admin_guide/
- Docker CLI help output from Docker 29.4.2 for swarm, service, node, network, stack, secret, and config commands.

## Issues Found
- The architecture overview said workers run the actual containers, which could imply managers never run workloads. Docker managers can also run tasks unless drained, so the wording was corrected.
- The main stack file used the official `postgres:15` image without required initialization credentials. Added a Swarm secret reference, `POSTGRES_PASSWORD_FILE`, and a prerequisite `docker secret create` command so the database service can start correctly.
- The drain-node example used `docker service ps myapp`, but `myapp` is the stack name in the earlier example, not a service name. Changed it to `docker service ps webapp`.
- The stdin secret example was labeled as creating a secret from a file. Updated the comment to say it creates the secret from stdin.
- The restore sequence stopped Docker and then immediately ran `docker swarm init --force-new-cluster`, which would fail while the daemon is stopped. Added removal of the existing swarm directory, restarted Docker, and then ran the force-new-cluster command, matching Docker's restore procedure.

## Review Notes
- The post uses the older colon-separated port publishing syntax such as `--publish 80:80`. Docker still supports this syntax, but the current Docker docs prefer the long syntax, such as `--publish published=80,target=80`, because it is clearer and more flexible.
- `docker stack deploy` currently uses the legacy Compose file version 3 format rather than the latest Compose Specification. The post's versioned stack examples are appropriate for Swarm stacks.
