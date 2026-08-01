# Validation Summary: How to Bring an Existing Docker Compose Stack Under Portainer Management

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Portainer 2.39 LTS
- Docker Engine
- Docker Compose
- Docker Swarm
- Compose stacks, projects, profiles, and override files
- Docker named and external volumes
- Docker networks, configs, secrets, labels, and bind mounts
- Git and Portainer GitOps deployments
- PostgreSQL 17 Docker Official Image

## Sources Consulted

- [Portainer: Access control](https://docs.portainer.io/advanced/access-control)
- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: Stacks](https://docs.portainer.io/user/docker/stacks)
- [Portainer: Recover orphaned stacks](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-i-recover-orphaned-stacks-from-a-previously-deleted-environment)
- [Portainer: Remove a stack](https://docs.portainer.io/user/docker/stacks/remove)
- [Portainer: How automatic Git updates work](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work)
- [Portainer source: stack deletion UI](https://github.com/portainer/portainer/blob/develop/app/react/docker/stacks/ItemView/StackInfoTab/StackActions.tsx)
- [Docker: Specify a Compose project name](https://docs.docker.com/compose/how-tos/project-name/)
- [Docker: `docker compose`](https://docs.docker.com/reference/cli/docker/compose/)
- [Docker: `docker compose config`](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker: `docker compose down`](https://docs.docker.com/reference/cli/docker/compose/down/)
- [Docker: Use profiles with Compose](https://docs.docker.com/compose/how-tos/profiles/)
- [Docker: Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker Compose: Services](https://docs.docker.com/reference/compose-file/services/)
- [Docker Compose: Volumes](https://docs.docker.com/reference/compose-file/volumes/)
- [Docker: Deploy a stack to a Swarm](https://docs.docker.com/engine/swarm/stack-deploy/)
- [Docker: Format command output](https://docs.docker.com/engine/cli/formatting/)
- [Docker: `docker container ls`](https://docs.docker.com/reference/cli/docker/container/ls/)
- [Docker Official Image: PostgreSQL](https://hub.docker.com/_/postgres/)

## Issues Found

- The cutover command used only `compose.yaml`, despite the guide requiring readers to record override files, interpolation inputs, and profiles. Docker Compose constructs the application model from the ordered `-f` files and only includes profiled services when their profiles are active. Changed the example to reuse an environment file and an ordered override file and to enable all profiles with `--profile "*"`, preventing profiled or override-only containers from being left running.
- The Git checklist implied that repository-relative bind mounts work without additional Portainer configuration. Current Portainer documentation requires **Enable relative path volumes**, a Business Edition feature, and a configured host path. Added that requirement to the existing checklist item.
- The rollback section claimed that Portainer versions may offer a stack-deletion option for associated volumes. Current Portainer documentation and stack-deletion UI do not expose such an option. Replaced the claim with accurate guidance not to delete volumes separately during rollback unless deletion is intentional and backed up.

## Review Notes

- All six documentation URLs in the post returned HTTP 200 during validation.
- The Compose volume example was parsed successfully with Docker Compose v5.1.4. Its `external: true` and `name: billing_database-data` mapping is valid and resolves to the intended engine volume without project scoping.
- The `postgres:17` tag remains supported, and `/var/lib/postgresql/data` is the correct persistent-data mount target for PostgreSQL 17 and earlier in the Docker Official Image.
- The Swarm guidance is correct for a stack definition already used with Swarm. Docker still documents that `docker stack deploy` uses the legacy Compose v3 format and is not compatible with every feature in the current Compose Specification.
