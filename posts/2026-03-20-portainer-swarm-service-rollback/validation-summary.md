# Validation Summary: How to Set Up Service Rollback in Portainer on Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm services
- Docker service CLI
- Compose Deploy Specification
- YAML service configuration

## Sources Consulted
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: `docker service update` - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: `docker service rollback` - https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker Docs: `docker service ps` - https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs: `docker service inspect` - https://docs.docker.com/reference/cli/docker/service/inspect/
- Portainer Docs: Configure service options - https://docs.portainer.io/user/docker/services/configure
- Portainer Docs: Roll back a service - https://docs.portainer.io/user/docker/services/rollback
- Moby SwarmKit source: manual rollback handling - https://github.com/moby/swarmkit/blob/master/manager/controlapi/service.go
- Moby SwarmKit source: automatic rollback handling - https://github.com/moby/swarmkit/blob/master/manager/orchestrator/update/updater.go

## Issues Found
- Added the prerequisite that CLI service-management commands must be run from a Swarm manager node, because Docker documents `docker service` management commands as cluster-management commands that execute on manager nodes.
- Reworded the automatic rollback explanation to match Docker's documented failure detection: rollback depends on updated tasks failing to start or stopping within the configured monitor period, together with `failure_action: rollback` and the configured failure threshold.
- Replaced the claim that you cannot "undo a rollback" via rollback. That statement is not generally supportable from Swarm's implementation; the post now states the documented limitation that automatic rollback depends on the configured monitor window and failure threshold.
- Reworded the deployment-strategy explanation so it describes Swarm's monitor window behavior instead of implying that Swarm simply waits for health checks to pass for the full period.

## Review Notes
- The post's Compose keys and Docker CLI commands are current and valid against the Docker and Portainer documentation checked on April 24, 2026.
- Portainer's documented UI action is `Rollback the service`, and it applies to Docker Swarm services only.
