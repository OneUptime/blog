# Validation Summary: How to Monitor ClickHouse Query Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- Prometheus metrics scraping
- ClickHouse Connect Python client
- OneUptime OTLP ingestion
- SQL
- YAML
- XML

## Sources Consulted
- ClickHouse Prometheus server configuration: https://clickhouse.com/docs/operations/server-configuration-parameters/settings#prometheus
- ClickHouse `system.metrics`: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse `system.events`: https://clickhouse.com/docs/operations/system-tables/events
- ClickHouse `system.query_log`: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse `system.parts`: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse MergeTree settings for `parts_to_delay_insert`, `parts_to_throw_insert`, and `max_parts_in_total`: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse Connect Python driver API: https://clickhouse.com/docs/integrations/language-clients/python/driver-api
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- Prometheus scrape and relabel configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The ClickHouse Prometheus XML used `<status_info>true</status_info>`, which is not listed in current ClickHouse Prometheus server settings. Replaced it with `<errors>true</errors>` and updated comments to match the documented `system.metrics`, `system.events`, `system.asynchronous_metrics`, and `system.errors` sources.
- The Collector Prometheus relabel replacement used `${1}`. The OpenTelemetry Collector applies environment variable substitution to `$` characters in embedded Prometheus config, so changed it to `$$1` to preserve the Prometheus capture-group replacement.
- The Collector exporter used the `otlp` exporter directly against `https://oneuptime.com/otlp`. OneUptime's documented Collector configuration uses `otlphttp` with JSON encoding and an `x-oneuptime-token` header, so updated the exporter and pipelines accordingly.
- The metric `ClickHouseMetrics_MemoryTrackingForMerges` did not match current ClickHouse metric names. Replaced it with `ClickHouseMetrics_MergesMutationsMemoryTracking` and updated the description.
- The active parts query and explanation treated the "too many parts" threshold as a fixed per-table limit of 300. ClickHouse applies `parts_to_delay_insert` and `parts_to_throw_insert` based on active parts in a single partition, with version/configuration caveats, and also has `max_parts_in_total` for table-wide limits. Updated the SQL to group by `partition` and changed the explanation to reference the configured `parts_to_throw_insert` threshold.

## Review Notes
The Python examples are syntactically valid and use current public ClickHouse Connect and OpenTelemetry Python APIs. The application-level row and byte counters depend on ClickHouse Connect summary/header data availability, so production implementations should verify the exact summary keys emitted by their ClickHouse server and driver versions.
