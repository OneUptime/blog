# Validation Summary: How to Set Up Centralized Logging for Containers via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker logging drivers
- Grafana Loki
- Grafana Alloy
- Grafana
- LogQL

## Sources Consulted
- Docker JSON file logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker logging driver plugins: https://docs.docker.com/engine/logging/plugins/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Grafana Loki install with Docker or Docker Compose: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki storage and TSDB guidance: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki log retention: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configuration/
- Grafana Loki Docker driver client: https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki Docker driver configuration: https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/logql/
- Grafana Loki LogQL template functions: https://grafana.com/docs/loki/latest/query/template_functions/
- Grafana Alloy Docker monitoring example: https://grafana.com/docs/alloy/latest/monitor/monitor-docker-containers/
- Grafana Alloy `loki.source.docker` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.docker/
- Grafana Promtail deprecation/EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Official Docker Hub tags for the Loki Docker plugin: https://hub.docker.com/r/grafana/loki-docker-driver/tags

## Issues Found
- The `daemon.json` example included a `//` comment inside a JSON block, which is invalid JSON. I removed the inline comment so the snippet matches a real Docker daemon config file.
- The post implied a Docker daemon restart fully applies the new logging defaults. Docker documents that new daemon logging defaults apply to newly created containers, so I added that clarification.
- The Compose example used the obsolete top-level `version` key. I removed it to align with the current Compose specification.
- The post deployed Promtail on March 20, 2026 even though Grafana marks Promtail as end-of-life as of March 2, 2026 and directs users to Grafana Alloy for future development. I replaced the Promtail-based collection path with an Alloy-based one using `discovery.docker` and `loki.source.docker`.
- The Loki config used the older BoltDB Shipper and `v11` schema. Grafana recommends TSDB for Loki 2.8+, so I updated the example to TSDB with schema `v13`.
- The Loki retention example claimed `retention_period` alone would keep logs for 30 days. Grafana documents that retention is enforced through the compactor and requires `retention_enabled` plus `delete_request_store`, so I added a working compactor configuration and converted retention to the supported `720h` duration format.
- The direct Docker-to-Loki example omitted the required Loki Docker logging plugin installation step. I added the plugin install command and verified the architecture-specific plugin tags.
- The direct Docker-to-Loki example used `loki-labels`, which is not a supported Loki Docker driver option. I replaced it with the supported `loki-external-labels` option and preserved the default `container_name` label explicitly.
- The direct Docker-to-Loki example relied on the Loki driver without re-stating log rotation options. Grafana documents that the Loki driver keeps its own JSON log file behavior and that `max-size` and `max-file` should be set explicitly, so I added them.
- Two LogQL examples assumed every log line was JSON-formatted. I changed them to format-agnostic queries so they work for generic container logs.
- The `query_range` curl example was labeled as a Portainer CLI tail equivalent, which was misleading. I corrected the wording to describe it as a Loki HTTP API query for recent logs.

## Review Notes
- The updated Loki example uses single-binary Loki with filesystem storage. Grafana documents this approach as suitable for evaluation, testing, development, and smaller setups; production-scale Loki generally uses other deployment patterns and object storage backends.
- Loki does not include an authentication layer by default. Production deployments should place an authenticating reverse proxy in front of Loki and Grafana.
- The post still uses `grafana/alloy:latest` and `grafana/grafana:latest`, which matches current official examples. Pin exact versions later if you want reproducible upgrades.
