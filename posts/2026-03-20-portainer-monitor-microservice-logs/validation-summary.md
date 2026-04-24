# Validation Summary: How to Monitor Microservice Logs Across Containers in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker and Docker Compose
- Grafana Loki
- Grafana Alloy
- Grafana
- LogQL
- Docker logging drivers

## Sources Consulted
- Portainer container logs documentation: https://docs.portainer.io/user/docker/containers/logs
- Portainer service logs documentation: https://docs.portainer.io/user/docker/services/logs
- Portainer services documentation: https://docs.portainer.io/user/docker/services
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `services.logging` reference: https://docs.docker.com/reference/compose-file/services/
- Grafana Loki Docker or Docker Compose install guide: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki storage schema guidance: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki log queries reference: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki Alloy ingestion guide: https://grafana.com/docs/loki/latest/send-data/alloy/
- Grafana Loki Docker driver overview: https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki Docker driver configuration: https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/
- Grafana Alloy Docker monitoring guide: https://grafana.com/docs/alloy/latest/monitor/monitor-docker-containers/
- Grafana Alloy `loki.source.docker` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.docker/
- Grafana Alloy `discovery.docker` reference: https://grafana.com/docs/alloy/latest/reference/components/discovery/discovery.docker/
- Grafana Alloy `discovery.relabel` reference: https://grafana.com/docs/alloy/latest/reference/components/discovery/discovery.relabel/
- Grafana Loki data source configuration: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Promtail deprecation / EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/installation/

## Issues Found
- The Portainer UI wording used `Auto-refresh` and `Timestamps`, but the current Portainer documentation uses `Auto refresh` and `Timestamp`. Updated the option names to match the documented UI.
- The stack-logs section implied a stack-wide log view. Portainer documents container logs and Swarm service logs as separate views, so the wording was corrected to direct readers from the stack view to the relevant service or container log view instead of implying a combined stack log stream.
- The centralized logging section was built around Promtail. Grafana documents Promtail as deprecated and end-of-life on March 2, 2026, so the post was outdated as of the validation date. Replaced the Promtail-based example with a current Grafana Alloy configuration that discovers Docker containers and sends logs to Loki.
- The Docker Compose example used the top-level `version` field. Docker documents that field as obsolete and warns when it is present, so it was removed.
- The Grafana section jumped straight to LogQL queries without configuring a Loki data source. Added the missing step to add Loki as a Grafana data source using `http://loki:3100`.
- The optional Docker `loki` logging-driver example used `labels: "service,version"`, which only forwards existing container labels and would not create the labels implied by the post. Simplified the example to the supported `loki-url` option, added the missing requirement to install the Loki Docker plugin on each host, and clarified that Docker Compose automatically adds `compose_project` and `compose_service` labels.

## Review Notes
- The revised Loki configuration uses the current recommended `tsdb` store with schema `v13` for a local filesystem-backed example, and the schema `from` date is set in the past so the configuration is immediately valid for a new installation.
- The Alloy example assumes a Docker environment where mounting `/var/run/docker.sock` is acceptable. That matches the Portainer + Docker context of the post.
- If readers choose the Docker Loki logging driver instead of Alloy, their Grafana queries should use labels such as `compose_service` rather than the `service` label used in the Alloy-based example.
- Local checks: `validation.json` was validated with `jq`. Docker Compose and the Alloy CLI are not installed in this workspace, so runtime validation with `docker compose config` or `alloy` was not possible.
