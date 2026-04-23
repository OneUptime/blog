# Validation Summary: How to Implement Rolling Updates with Portainer on Swarm - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Docker Swarm
- Docker Compose Deploy Specification
- Docker Engine API
- Docker CLI
- Portainer API
- Traefik Swarm provider
- Bash
- YAML

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services `healthcheck`: https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker Swarm service update behavior: https://docs.docker.com/engine/swarm/services/#configure-a-services-update-behavior
- Docker CLI `docker service update`: https://docs.docker.com/reference/cli/docker/service/update/
- Docker CLI `docker service rollback`: https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker CLI `docker service ps`: https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Engine API v1.54 service update endpoint: https://docs.docker.com/reference/api/engine/version/v1.54/
- Portainer API usage examples and Docker API proxy: https://docs.portainer.io/api/examples
- Traefik Swarm provider labels: https://doc.traefik.io/traefik/reference/install-configuration/providers/swarm/
- Moby Swarm service update state constants: https://github.com/moby/moby/blob/master/api/types/swarm/service.go

## Issues Found
- The Compose snippet used the obsolete top-level `version: "3.8"` property. Removed it because the current Compose Specification treats `version` as only informative and obsolete.
- The Traefik labels were placed as container labels. Moved them under `deploy.labels` because Traefik's Swarm provider reads service labels in Swarm mode.
- The Portainer API update example sent the full object returned by `GET /services/{id}`. Changed the `jq` expression to send `.Spec` with the image updated, matching Docker Engine's required `ServiceSpec` request body.
- The Portainer API rollback example used `rollback=true` and did not send a service spec body. Changed it to fetch the current service version, post to `rollback=previous`, and include the current `.Spec` body.
- The post overstated readiness behavior by treating task `Running` state as equivalent to a healthy application. Updated wording to distinguish task execution from health checks, and clarified that `start-first` requires spare capacity and graceful app behavior for zero-downtime deployments.
- The monitor script could report success before checking a paused update and used failed task history as the rollback trigger. Updated it to inspect `UpdateStatus.State`, handle paused and rollback states, and require `completed` before declaring success.
- The final health verification counted running tasks but labeled them as healthy. Renamed the check and output so it verifies tasks are still running after the health-check window rather than claiming direct health status.
- The zero-downtime verification script printed the raw error count as a percentage. Added integer percentage calculation before printing the error rate.

## Review Notes
The Bash snippets pass `bash -n`, and the YAML configuration parses successfully. Docker CLI was not installed in the local workspace, so CLI options and API behavior were verified against official Docker documentation and the Docker Engine API specification. The healthcheck example assumes `curl` is available in the application image.
