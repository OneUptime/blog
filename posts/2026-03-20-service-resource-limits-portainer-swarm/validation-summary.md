# Validation Summary: How to Configure Service Resource Limits in Portainer on Swarm - Swarm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm
- Portainer
- Docker services
- Docker Compose deploy configuration
- Docker CLI
- Container resource monitoring

## Sources Consulted
- Portainer Documentation: Configure service options - https://docs.portainer.io/user/docker/services/configure
- Portainer Documentation: View container statistics - https://docs.portainer.io/user/docker/containers/stats
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: docker service create - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker service update - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: docker container stats - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: docker stack deploy - https://docs.docker.com/reference/cli/docker/stack/deploy/

## Issues Found
- The monitoring section implied that `docker stats` shows all running containers in the Swarm cluster. Docker's `stats` command reports containers for the current Docker daemon, so in Swarm usage it should be run on the node running the relevant task. Updated the wording and command comment to clarify this.
- The tips section said CPU limits prevent CPU throttling from causing latency spikes. Docker CPU limits are enforced with CPU quotas and can themselves cause throttling when set too low. Updated the tip to say that CPU limits cap CPU usage but overly low limits can cause throttling and latency spikes.

## Review Notes
The `deploy.resources.reservations` and `deploy.resources.limits` Compose keys, the `cpus` and `memory` fields, and the Docker service CLI flags used in the post are valid for Swarm services. Docker's current `docker stack deploy` documentation still supports Compose file version 3.0 and above, while noting that stack deploy uses the legacy Compose v3 format rather than the latest Compose Specification; the `version: "3.8"` line was left unchanged for this Swarm-focused example.
