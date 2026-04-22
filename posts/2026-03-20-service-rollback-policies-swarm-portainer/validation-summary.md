# Validation Summary: How to Configure Service Rollback Policies in Portainer on Swarm (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Swarm services
- Docker Compose deploy configuration
- Docker service rollback and inspect commands
- Docker health checks

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm services documentation: https://docs.docker.com/engine/swarm/services/
- Docker CLI reference for `docker service rollback`: https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker CLI reference for `docker service update`: https://docs.docker.com/reference/cli/docker/service/update/
- Docker CLI reference for `docker service inspect`: https://docs.docker.com/reference/cli/docker/service/inspect/
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/builder/#healthcheck
- Moby Docker Engine SDK service type showing `PreviousSpec`: https://pkg.go.dev/github.com/moby/moby/api/types/swarm#Service
- Portainer stack editor documentation: https://docs.portainer.io/user/docker/stacks/edit
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer automatic stack updates FAQ: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work

## Issues Found
- The manual rollback section did not state that `docker service rollback` must be run from a Swarm manager node. Updated the text and command comment to specify a Swarm manager node, matching Docker's cluster management command requirements.
- The rollback inspection section used `docker service inspect --pretty` and described it as update history. Docker exposes the retained rollback target as `PreviousSpec` in service inspect data, while `--pretty` is only a human-readable summary. Updated the command to inspect `.PreviousSpec` directly and clarified that this is the retained previous spec, not a full history.
- The health-check example used `monitor: 30s` with `start_period: 20s`, `interval: 10s`, and `retries: 3`, which may not allow enough time for the task to become unhealthy during the update monitor window. Increased the monitor window to `60s` and clarified that rollback is triggered when the replica becomes unhealthy during that window.

## Review Notes
The Docker CLI was not installed in the local review environment, so command syntax was verified against the official Docker CLI documentation rather than local `--help` output. The top-level Compose `version: "3.8"` field is accepted by Swarm stack files, though modern Compose Specification documents treat versioned Compose formats as legacy.
