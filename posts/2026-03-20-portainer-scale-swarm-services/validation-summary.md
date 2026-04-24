# Validation Summary: How to Scale Services in Portainer on Docker Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Service scaling
- Rolling updates

## Sources Consulted
- Portainer Documentation: Scale a service - https://docs.portainer.io/user/docker/services/scale
- Portainer Documentation: Configure service options - https://docs.portainer.io/user/docker/services/configure
- Portainer Documentation: Docker roles and permissions - https://docs.portainer.io/advanced/docker-roles-and-permissions
- Docker Docs: docker service scale - https://docs.docker.com/reference/cli/docker/service/scale/
- Docker Docs: docker service update - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: docker service ps - https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs: docker container stats - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: How services work - https://docs.docker.com/engine/swarm/how-swarm-mode-works/services/

## Issues Found
- The post implied any Swarm service could be scaled. Updated the description, introduction, prerequisites, and conclusion to refer to replicated services, because `docker service scale` does not apply to global-mode services.
- The Portainer UI instructions used inaccurate labels and an imprecise service-detail flow. Updated the steps to match Portainer's current documentation, including the `Scheduling Mode` column, the scale action, the tick icon, and the `Service details` section.
- The "scale multiple services at once" Portainer UI workflow was not supported by the Portainer documentation reviewed. Replaced it with the documented Docker CLI method for scaling multiple replicated services.
- The scheduler explanation said placement was based on current load. Reworded it to match Docker's documentation: placement depends on resource availability requirements plus placement constraints and preferences.
- The shell-script autoscaler example was technically incorrect because it passed Swarm task IDs from `docker service ps -q` into `docker stats`, which accepts container names or IDs and only reports on the daemon being queried. Removed the broken example and replaced it with a narrower, accurate explanation of external autoscaling.
- The recommendation to deploy `stefanprodan/swarm-cronjob` as a Swarm autoscaler was incorrect. Removed it because the snippet did not implement autoscaling.
- The section on `--update-parallelism` incorrectly stated that it controls how quickly scale-up replicas start. Rewrote it to explain that it applies to service updates and forced rolling restarts, not ordinary scaling.
- The best-practices bullets overstated Swarm behavior around placement constraints and health checks. Updated them to reflect documented behavior.

## Review Notes
- Portainer's documented service-scaling UI covers single-service scaling; bulk changes across multiple services are better represented with the Docker CLI.
- Operator access is a Portainer Business Edition RBAC concept; Community Edition users typically need admin access for equivalent management actions.
- Docker Swarm does not include built-in auto-scaling; external monitoring and automation are required for that behavior.
