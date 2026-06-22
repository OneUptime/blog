# Validation Summary: How to Run Loki in Docker and Docker Compose

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Grafana Loki
- Docker
- Docker Compose
- Grafana
- Promtail
- Grafana Alloy
- MinIO / S3-compatible object storage
- NGINX
- LogQL

## Sources Consulted
- Grafana Loki Docker installation documentation: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki deployment modes documentation: https://grafana.com/docs/loki/latest/get-started/deployment-modes/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki LogQL/query documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki data source documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose Services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose Version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Docker Compose snippets used the obsolete top-level `version` key. Removed it because current Docker Compose validates against the current Compose Specification and only treats `version` as informational.
- The post presented Promtail as a current production log collector. Added a note that Promtail reached end-of-life on March 2, 2026, and that Grafana Alloy or another supported client should be used for new production deployments.
- The Loki retention example used deprecated `table_manager` retention settings with TSDB. Replaced those settings with `limits_config.retention_period` and `limits_config.max_query_lookback`, leaving compactor retention enabled.
- The distributed Docker Compose example used `container_name` with replicated services and published fixed host ports on scalable services. Removed `container_name` from scalable Loki services and removed direct host port mappings from read/write/backend targets so Compose can scale the read service.
- The distributed example configured two write replicas and `replication_factor: 2`, which is not a sound Docker Compose example with shared named volumes and no proper stateful orchestration. Changed the example to a local simple scalable deployment with one write target and `replication_factor: 1`.
- The post described the Docker Compose distributed setup as production-ready. Changed the wording to describe it as a local simple scalable deployment example.

## Review Notes
- Verified the corrected single-node and distributed Loki configuration snippets with `grafana/loki:2.9.4 -verify-config=true`.
- Verified the corrected distributed Compose snippet with `docker compose config`.
- The NGINX gateway configuration is syntactically plausible in the Compose network, but a standalone `nginx -t` outside that network cannot resolve the Docker service names.
