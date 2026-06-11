# Validation Summary: How to Create Docker Swarm Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Swarm mode
- Docker service CLI
- Docker overlay networking
- Docker stack deploy
- Compose file version 3 deploy configuration

## Sources Consulted
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: Manage swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Use Swarm mode routing mesh - https://docs.docker.com/engine/swarm/ingress/
- Docker Docs: docker service create CLI reference - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker service update CLI reference - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Local Docker CLI help output from Docker 29.4.2 for `docker service create`, `docker service update`, `docker service rollback`, `docker service scale`, `docker network create`, `docker node update`, and `docker stack deploy`.

## Issues Found
- The rollback flow diagram implied that a failed health check automatically retries the same task before rechecking. Docker's documented update behavior is controlled by update monitoring, failure ratios, and the configured failure action. Changed the diagram node from "Retry Task" to "Continue According to Policy".
- The health check section said Swarm uses health checks to ensure it only routes traffic to healthy containers. Docker documents health check flags and routing to active tasks, but the official Swarm routing mesh documentation does not support that exact health-aware routing claim. Reworded the sentence to say Docker monitors container health and can use that status during service updates.

## Review Notes
- The `docker stack deploy` example uses `version: '3.8'`, which is appropriate for Docker stack because Docker documents that `docker stack deploy` uses the legacy Compose file version 3 format rather than the latest Compose Specification.
- The stack YAML was validated with `docker stack config`; Docker accepted the structure and normalized the service, network, volume, deploy, port, and placement fields.
