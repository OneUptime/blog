# Validation Summary: How to View Service Logs in Portainer on Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Engine CLI
- Docker logging drivers
- Fluentd
- Grafana Loki
- Grafana Alloy

## Sources Consulted
- Portainer Docs, "Services" - https://docs.portainer.io/user/docker/services
- Portainer Docs, "View service logs" - https://docs.portainer.io/user/docker/services/logs
- Portainer Docs, "View the status of a service task" - https://docs.portainer.io/sts/user/docker/services/tasks
- Portainer Docs, "Docker roles and permissions" - https://docs.portainer.io/advanced/docker-roles-and-permissions
- Docker Docs, "`docker service logs`" - https://docs.docker.com/reference/cli/docker/service/logs/
- Docker Docs, "`docker service ps`" - https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs, "Configure logging drivers" - https://docs.docker.com/engine/logging/configure/
- Docker Docs, "JSON File logging driver" - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs, "Fluentd logging driver" - https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker Docs, "Customize log driver output" - https://docs.docker.com/engine/logging/log_tags/
- Docker Docs, "Services" - https://docs.docker.com/reference/compose-file/services/
- Grafana Loki Docs, "Docker driver client" - https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki Docs, "Docker driver client configuration" - https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/
- Grafana Loki Docs, "Install Loki with Docker or Docker Compose" - https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki Docs, "Ingesting logs to Loki using Alloy" - https://grafana.com/docs/loki/latest/send-data/alloy/
- Grafana Loki Docs, "`docker` stage" - https://grafana.com/docs/loki/latest/send-data/promtail/stages/docker/

## Issues Found
- The Portainer navigation and viewer details were outdated. The post referred to a Logs icon and Logs tab, and listed old viewer options. I updated the instructions to the current **Service logs** workflow and replaced the options list with the current Portainer log-viewer controls documented by Portainer.
- The task-specific CLI example was incorrect. `docker service logs` accepts a service name/ID or a task ID, not a `service.replica` identifier like `web-frontend.1`. I replaced that example with `docker service ps web-frontend` followed by `docker service logs <task-id>`, and added the manager-node requirement from Docker's CLI docs.
- The production logging section implied that built-in service-log access behaves the same after switching drivers. Docker documents `docker service logs` only for services using the `json-file` or `journald` logging driver, so I added that caveat and clarified that Fluentd or Loki should be queried in their own backend once configured.
- The Loki logging-driver example omitted a required prerequisite and used an invalid label example. Grafana documents that the Loki Docker driver plugin must be installed first, and `loki-external-labels` uses Docker tag-template syntax. I corrected the example accordingly.
- The centralized logging stack example used Promtail even though Promtail was deprecated and reached End-of-Life on March 2, 2026, and the snippet itself lacked the required Promtail configuration file mount. I replaced that section with Grafana's current official Loki + Grafana + Alloy reference deployment commands.

## Review Notes
- Portainer's Operator role is only available in Portainer Business Edition. Community Edition users generally need administrator access or direct access to the resource.
- The Grafana example stack is a validated reference deployment. Grafana's current Loki docs recommend Helm or Tanka for production Loki deployments rather than treating the Docker Compose example as a production architecture.
