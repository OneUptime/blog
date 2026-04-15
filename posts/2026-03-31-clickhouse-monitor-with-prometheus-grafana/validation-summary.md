# Validation Summary: How to Monitor ClickHouse with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- ClickHouse (database and system tables)
- Prometheus (metrics scraping and storage)
- Grafana (visualization and dashboards)
- clickhouse_exporter (ClickHouse Prometheus exporter)
- systemd (service management)
- PromQL (query language for metrics)

## Sources Consulted
- ClickHouse/clickhouse_exporter GitHub repository: https://github.com/ClickHouse/clickhouse_exporter
- Altinity/clickhouse-operator GitHub repository (verified the blog's original URL was wrong): https://github.com/Altinity/clickhouse-operator
- Prometheus default port allocations wiki: https://github.com/prometheus/prometheus/wiki/Default-port-allocations
- ClickHouse Prometheus interface documentation: https://clickhouse.com/docs/interfaces/prometheus
- Grafana installation docs (Debian/Ubuntu): https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/
- Grafana Dashboard HTTP API docs: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana.com ClickHouse dashboard 14192: https://grafana.com/grafana/dashboards/14192-clickhouse/
- Grafana Cloud ClickHouse integration docs: https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-clickhouse/

## Issues Found

1. **Wrong GitHub repository URL**: The post referenced `Altinity/clickhouse-exporter` which does not exist. The correct repository is `ClickHouse/clickhouse_exporter`. Fixed the download URL, binary name, and all systemd service references to use `clickhouse_exporter` (with underscore) matching the actual project.

2. **CLI flag prefix style**: The exporter uses Go's `flag` package which accepts single-dash flags (`-scrape_uri`). Changed `--scrape_uri`, `--telemetry.address`, and `--telemetry.endpoint` to use single-dash prefix (`-scrape_uri`, `-telemetry.address`, `-telemetry.endpoint`) to match the canonical style from the project's documentation.

3. **Outdated Grafana APT repository**: The post used the deprecated `packages.grafana.com/oss/deb` repository URL and the deprecated `apt-key` command. Updated to the current official method: GPG key stored in `/etc/apt/keyrings/`, repository at `apt.grafana.com`, and `signed-by` directive in the sources list.

4. **Invalid Grafana dashboard import API call**: The post used a `path` field in the `/api/dashboards/import` request body, which is not a valid field in the Grafana API. Replaced with the correct two-step approach: first fetch the dashboard JSON from grafana.com, then POST it with the `dashboard` field in the import request body.

## Review Notes
- Port 9116 is used throughout the post as the exporter port. While this is the actual default for `ClickHouse/clickhouse_exporter`, port 9116 is officially allocated to the SNMP exporter in the Prometheus ecosystem. The officially allocated ClickHouse Prometheus port is 9363. This is not incorrect for the standalone exporter, but could cause a port conflict if the SNMP exporter is also running on the same host.
- The `folderId` field used in the Grafana dashboard import API is deprecated in recent Grafana versions in favor of `folderUid`. The value `0` (General folder) still works but may be removed in future versions.
- The metric names used (e.g., `ClickHouseMetrics_Query`, `ClickHouseProfileEvents_Query`, `ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay`) are correct and match the naming convention from the ClickHouse Prometheus endpoint.
- ClickHouse also supports a built-in Prometheus endpoint (since v20.x) configured in `config.xml`, which eliminates the need for an external exporter. The post's approach using a standalone exporter is still valid but readers should be aware of the native alternative.
- Dashboard ID 14192 is confirmed to be a real, legitimate ClickHouse dashboard on grafana.com published by Grafana Labs.
