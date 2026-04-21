# Validation Summary: How to Configure Docker Swarm Service Health Checks with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Swarm services
- Docker stack / Compose YAML
- Docker health checks
- Docker service rolling updates and rollback
- `docker inspect`

## Sources Consulted
- Docker official documentation: Compose file `healthcheck` attribute - https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker official documentation: Dockerfile `HEALTHCHECK` reference - https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker official documentation: Swarm services and tasks - https://docs.docker.com/engine/swarm/how-swarm-mode-works/services/
- Docker official documentation: Compose Deploy Specification `update_config` and `rollback_config` - https://docs.docker.com/reference/compose-file/deploy/
- Docker official documentation: `docker service create` options for health checks and update monitoring - https://docs.docker.com/reference/cli/docker/service/create/
- Docker official documentation: `docker service update` options and automatic rollback behavior - https://docs.docker.com/reference/cli/docker/service/update/
- Docker official documentation: `docker stack deploy` Compose file support - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Portainer official documentation: Services overview - https://docs.portainer.io/user/docker/services
- Portainer official documentation: Add a new service - https://docs.portainer.io/user/docker/services/add
- Portainer official documentation: Configure service options - https://docs.portainer.io/user/docker/services/configure
- Portainer official documentation: View the status of a service task - https://docs.portainer.io/user/docker/services/tasks
- Portainer official documentation: View a container's details - https://docs.portainer.io/user/docker/containers/view
- NGINX official Docker image source: Debian Dockerfile includes `curl` - https://github.com/nginx/docker-nginx/blob/master/mainline/debian/Dockerfile

## Issues Found
1. **Portainer UI health-check form was overstated**: The post said to configure health checks directly under a Portainer Services UI "Health check" section. Current Portainer service documentation covers adding, configuring, inspecting, and viewing service tasks, but does not document a dedicated Swarm service health-check form. **Fix:** Changed the section to recommend defining `healthcheck` in the stack YAML deployed through Portainer, while keeping the same health-check option explanations.
2. **Health-check output location was incorrect**: The post directed readers to the container logs tab for health-check logs. Docker stores health-check command output under the container health status and exposes it through inspect data, not the normal container log stream. **Fix:** Changed the guidance to use Portainer's container details/inspect view or `docker inspect --format='{{json .State.Health}}' <container_id>`.
3. **Portainer task navigation was imprecise**: The monitoring section said to click the service and then a task. Portainer's documentation says to expand the service's task list and then select an individual task to open its container details. **Fix:** Updated the steps to match the documented task navigation.
4. **Rolling update rollback timing needed a monitor-window caveat**: The post implied any unhealthy new task would stop and roll back an update. Docker only treats failures during the update monitor window as update failures for rollback purposes. **Fix:** Added a note to set `monitor` long enough to cover the health-check timing and changed the sample monitor value from `30s` to `3m`.
5. **Recovery wording was too broad**: The post described recovery of unhealthy "containers" generally. In Swarm, the task fails and the orchestrator creates a replacement task according to the service's desired state. **Fix:** Changed wording to "service tasks" and "failed tasks" where appropriate.

## Review Notes
- The `healthcheck` YAML fields (`test`, `interval`, `timeout`, `retries`, and `start_period`) are valid Compose/stack service fields.
- `CMD` and `CMD-SHELL` forms are valid for `healthcheck.test`.
- The NGINX example uses `curl`; the current official NGINX Debian Dockerfile includes `curl`, but custom images must include the command used by their health check.
- The top-level `version: "3.8"` field is still accepted for Docker stack files, although the modern Compose Specification treats the `version` property as obsolete and informative for `docker compose` usage.
