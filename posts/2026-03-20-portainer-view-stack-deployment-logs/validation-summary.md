# Validation Summary: How to View Stack Deployment Logs in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Docker logging drivers
- Grafana Loki

## Sources Consulted
- Portainer Docs, "View container logs" - https://docs.portainer.io/user/docker/containers/logs
- Portainer Docs, "View service logs" - https://docs.portainer.io/user/docker/services/logs
- Portainer Docs, "Inspect or edit a stack" - https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Docs, "Add a new stack" - https://docs.portainer.io/sts/user/docker/stacks/add
- Docker Docs, "`docker compose logs`" - https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker Docs, "`docker service logs`" - https://docs.docker.com/reference/cli/docker/service/logs/
- Docker Docs, "Deploy a stack to a swarm" - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, "Configure pre-defined environment variables in Docker Compose" - https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Docker Docs, "Define services in Docker Compose" - https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "Configure logging drivers" - https://docs.docker.com/engine/logging/configure/
- Docker Docs, "Fluentd logging driver" - https://docs.docker.com/engine/logging/drivers/fluentd/
- Grafana Loki Docs, "Docker driver client" - https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki Docs, "Docker driver client configuration" - https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/

## Issues Found
- The Portainer log viewer details were outdated. The post said the default view shows 100 lines and implied browser search was the main search method. Portainer's current docs show a default of 1000 lines plus built-in Search, Filter search results, Date picker, Line numbers, Timestamp, Wrap lines, Auto refresh, Copy, Download logs, and Full screen. I updated the log-viewer description, the default line count, and the search instructions to match the current UI.
- The stack detail workflow was too generic for Portainer's current behavior. Portainer shows containers for Docker Standalone / Podman stacks, but services and their tasks for Docker Swarm stacks. I updated the stack-detail steps so they are correct for both environment types.
- The Docker CLI section was incomplete and partially incorrect for Portainer-managed stacks. `docker compose logs` requires the matching Compose file context, and Swarm stacks use `docker service logs` rather than `docker compose logs`. I corrected the examples to show valid Docker Standalone commands with `-f /path/to/compose.yaml` and separate Docker Swarm commands with `docker service logs`.
- The Loki example omitted a required prerequisite. The `loki` logging driver requires the Loki Docker driver plugin to be installed on each Docker host. I added that requirement before the Compose example.
- The troubleshooting note about truncated logs was too narrow. I updated it to reflect Portainer's current controls: increasing the Lines setting, widening the date range, or refreshing the view.

## Review Notes
- `docker service logs` is documented for Swarm manager nodes and only for services using the `json-file` or `journald` logging drivers. If a Swarm stack is configured with another driver, built-in service log access may be limited and the centralized backend becomes the source of truth.
- The deployment output block in the post is illustrative rather than version-specific. Exact wording and resource names can vary depending on the runtime and Portainer environment type.
