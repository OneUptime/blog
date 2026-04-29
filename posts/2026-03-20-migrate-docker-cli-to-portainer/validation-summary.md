# Validation Summary: How to Migrate from Docker CLI to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Portainer Community Edition
- Portainer API
- composerize

## Sources Consulted
- Portainer CE install with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer initial setup (CE): https://docs.portainer.io/start/install-ce/server/setup
- Portainer stacks documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer API access: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer user management: https://docs.portainer.io/admin/user
- Portainer teams: https://docs.portainer.io/admin/user/teams/add
- Portainer environment access management: https://docs.portainer.io/admin/environments/environments
- Portainer access control: https://docs.portainer.io/advanced/access-control
- Portainer container details: https://docs.portainer.io/user/docker/containers/view
- Docker Compose v1 retirement notice: https://docs.docker.com/retired/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker `run` reference and resource constraints: https://docs.docker.com/engine/containers/run/
- Docker `inspect` CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- composerize repository and CLI usage: https://github.com/composerize/composerize

## Issues Found
1. The Portainer install command used `portainer/portainer-ce:latest`, while the current Portainer CE installation docs use `portainer/portainer-ce:sts`. Updated the image tag to match the documented install path.
2. The post used deprecated Docker Compose v1 commands (`docker-compose`). Updated those examples and the command mapping table to use Compose v2 (`docker compose`), which is the current Docker CLI.
3. The stack-conversion section implied a direct workflow from `docker inspect` output to the shown composerize command, and the composerize example itself did not match the tool's documented CLI usage. Reworded the section so `docker inspect` is used to review settings, then used the documented `composerize docker run ... > compose.yaml` pattern.
4. The Portainer access-control section used outdated navigation (`Settings > Users`, `Settings > Teams`) and oversimplified role assignment. Updated it to the current `User-related` and `Environment-related` navigation and described access assignment in terms of users, teams, and environment permissions.
5. The introduction and conclusion overstated Portainer's scope and migration guarantees by saying it exposed "all Docker functionality" and that the migration was "zero-downtime". Adjusted this to the technically accurate claim that installing Portainer alongside Docker is non-disruptive, while converting existing containers into stacks may require redeployment.
6. The CLI-to-UI mapping for listing containers used outdated UI wording. Simplified the `docker ps` and `docker ps -a` mappings to the current `Containers` view.

## Review Notes
- Portainer's documented CE install still publishes port `8000` alongside `9443`; `8000` is used for Portainer's tunnel server and may be unnecessary if that functionality is not needed.
- Portainer Community Edition supports user management, but more granular RBAC workflows are documented as Business Edition capabilities. The revised post avoids claiming BE-only role behavior for a CE install.
- `composerize` is a third-party helper, not a native Docker or Portainer feature.
