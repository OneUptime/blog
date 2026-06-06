# Validation Summary: Build a Database Performance Dashboard from OpenTelemetry SQL Span Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry semantic conventions for database client spans
- OpenTelemetry Collector Span Metrics Connector
- OpenTelemetry Collector Transform Processor
- Prometheus Remote Write exporter
- Prometheus and PromQL
- Grafana dashboards

## Sources Consulted
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/sql/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry Collector Span Metrics Connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post used legacy database semantic convention attributes (`db.name`, `db.operation`, and `db.statement`). Updated them to the current stable attributes (`db.namespace`, `db.operation.name`, and `db.query.text`) and updated the Collector dimensions and transform example accordingly.
- The post used `db.system`, which has migrated to `db.system.name` in the current database semantic conventions. Updated the attribute and matching Prometheus label selector to `db_system_name`.
- The Prometheus Remote Write exporter was configured as `prometheusremotewrite`, which is now a deprecated alias. Updated it to `prometheus_remote_write`.
- The Span Metrics Connector example used deprecated `dimensions_cache_size`. Replaced it with `aggregation_cardinality_limit`.
- The PromQL examples used stale labels such as `db_name`, `db_operation`, and `db_system`. Updated them to Prometheus-normalized labels generated from the corrected OpenTelemetry attributes: `db_namespace`, `db_operation_name`, and `db_system_name`.
- The transform processor example used the old `db.statement` attribute and unqualified `attributes[...]` path. Updated it to `span.attributes["db.query.text"]` with `error_mode: ignore`, matching current transform processor examples.

## Review Notes
The example sets `namespace: ""` on the Span Metrics Connector so the Prometheus metric names match the post's `duration_milliseconds_*` queries. If the connector namespace is omitted, the current default namespace prefixes metric names as `traces_span_metrics_duration_milliseconds_*` after Prometheus normalization.
