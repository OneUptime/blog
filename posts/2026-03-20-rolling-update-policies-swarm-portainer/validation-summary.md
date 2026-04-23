# Validation Summary: How to Set Up Rolling Update Policies for Swarm Services in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker stack / Compose YAML
- Docker service rolling updates
- Docker CLI

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm rolling update tutorial: https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/
- Docker `docker service update` CLI reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker `docker service ps` CLI reference: https://docs.docker.com/reference/cli/docker/service/ps/
- Docker `docker service rollback` CLI reference: https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker Swarm task states documentation: https://docs.docker.com/engine/swarm/how-swarm-mode-works/swarm-task-states/
- Docker stack deploy documentation: https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer inspect/edit a stack documentation: https://docs.portainer.io/user/docker/stacks/edit

## Issues Found
- The description and introduction promised zero-downtime deployments too broadly. Revised the wording to describe controlled rolling updates that help maintain availability, because Docker Swarm's default update order is `stop-first` and zero downtime depends on application readiness, capacity, and service design.
- The `monitor` explanation described monitoring after each batch before marking success. Updated it to match Docker's Deploy Specification: `monitor` is the duration after each task update to monitor for failure.
- The Portainer progress description implied each replica status changes from old running to updating to new running. Updated it to describe services and individual tasks, matching Portainer's Swarm service/task view and Docker's task model.
- The task-state sequence said tasks cycle from old running to shutdown to preparing to new running. Corrected it because Swarm tasks do not move backward or restart as the same task; the old task is shown as `Shutdown`, while a replacement task moves through startup states to `Running`.
- The force redeploy description said `docker service update --force` is useful for config changes. Clarified that it forces a rolling restart without service parameter changes, matching the Docker CLI reference.

## Review Notes
- The YAML fields `deploy.update_config`, `deploy.rollback_config`, and `deploy.restart_policy` are valid for Docker Swarm stack deployments.
- The commands `docker service ps`, `docker service ps --no-trunc`, `docker service update --force`, and `docker service rollback` are valid Swarm manager commands.
- The local environment did not have the Docker CLI installed, so command verification was performed against the official Docker CLI reference instead of local `--help` output.
- The post does not cover optional `update_config.order` or health checks. Those can be useful future additions for stronger availability behavior, but they are not required for the shown rolling update policy to work.
