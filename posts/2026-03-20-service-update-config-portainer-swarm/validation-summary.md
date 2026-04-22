# Validation Summary: How to Set Up Service Update Configuration in Portainer on Swarm - Swarm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm
- Portainer
- Docker services
- Docker Compose deploy configuration
- Rolling updates and rollbacks

## Sources Consulted
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: docker service update - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: docker service rollback - https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker Docs: docker service ps - https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs: docker service inspect - https://docs.docker.com/reference/cli/docker/service/inspect/
- Portainer Documentation: Configure service options - https://docs.portainer.io/user/docker/services/configure

## Issues Found
- The post said Swarm update configuration applies when you "push a new image." Docker Swarm does not update service tasks merely because a new image was pushed to a registry; a service update must change or re-resolve the service image. Changed this to "update the service to use a new image."
- The post used absolute zero-downtime language. Docker's `start-first` order starts the new task before stopping the old task, but zero downtime still depends on health checks, capacity, application readiness, and networking. Changed the wording to "minimize" or "reduce" downtime.
- The failure action table described the action as applying when "a task fails." Docker applies `failure_action` when the update fails according to the configured failure ratio and monitoring window. Updated the description to refer to update failure.
- The `docker service update --force` comment said it was useful for config changes. Docker documents this flag as forcing task replacement even when no parameters changed, commonly for rolling restarts. Updated the comment accordingly.
- The `docker service inspect api --pretty` comment said it checked service events. The command displays service details, status, and update configuration, not an event stream. Updated the comment to match the command output.

## Review Notes
The Compose example uses valid Swarm `deploy.update_config` and `deploy.rollback_config` keys and values. Docker's current Compose Specification marks the top-level `version` property as obsolete for modern Compose files, but Docker's `docker stack deploy` documentation still describes stack deployment from Compose file version 3.0 and above, so the `version: "3.8"` line was left unchanged for this Swarm-focused post.
