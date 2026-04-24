# Validation Summary: How to Set Up Centralized Logging for Containers via Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Grafana Loki
- Grafana Alloy
- Grafana
- Fluentd
- Syslog
- LogQL

## Sources Consulted
- Grafana Loki install docs: https://grafana.com/docs/loki/latest/setup/install/docker/
- Promtail status and deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy `loki.source.docker` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.docker/
- Grafana Alloy Docker monitoring guide: https://grafana.com/docs/grafana-cloud/send-data/alloy/monitor/monitor-docker-containers/
- Grafana Alloy `discovery.docker` reference: https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/components/discovery/discovery.docker/
- Grafana Loki log queries reference: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki metric queries reference: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki retention docs: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki storage docs: https://grafana.com/docs/loki/latest/configure/storage/
- Docker Fluentd logging driver docs: https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker Syslog logging driver docs: https://docs.docker.com/engine/logging/drivers/syslog/
- Docker Compose services reference for canonical labels: https://docs.docker.com/reference/compose-file/services/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Portainer container logs docs: https://docs.portainer.io/user/docker/containers/logs

## Issues Found
- The post recommended Promtail as the preferred Loki collector even though Grafana documents Promtail as end-of-life as of March 2, 2026. I replaced the recommended option and collector config with Grafana Alloy.
- The architecture diagram implied Portainer is the centralized log viewing UI for Loki/Elasticsearch/syslog data. Portainer documents container log viewing, not a generic centralized log UI, so I corrected the diagram labels.
- The Option 1 stack mounted `loki.yaml` but the post only provided a partial retention fragment. I expanded the retention section into a working single-binary Loki config based on Grafana’s official local config pattern.
- The Loki retention snippet was incomplete for current Loki because `compactor.delete_request_store` is required when retention is enabled. I added that setting and kept the schema on a 24h TSDB index period, which the retention docs require.
- The Fluentd deployment snippet referenced `fluentd_logs` and `logging_net` without defining them. I added the missing top-level `volumes` and `networks` blocks so the stack is deployable as shown.
- The LogQL aggregation example used invalid aggregation syntax. I corrected `sum(rate(...)) by (container)` to `sum by (container) (rate(...))`.

## Review Notes
- The Loki config now uses the filesystem object store, which Grafana documents as suitable for local development and smaller single-node setups, not as a production-grade storage backend.
- The Compose file still includes a top-level `version` field. Docker documents that field as obsolete but still accepted for backward compatibility.
- The Alloy and Grafana images use `latest` tags in the corrected example. That is valid, but pinning exact versions would make the post more reproducible in the future.
