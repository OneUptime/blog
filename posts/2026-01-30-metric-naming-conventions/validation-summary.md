# Validation Summary: How to Build Metric Naming Conventions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus metrics
- OpenTelemetry metrics and semantic conventions
- Metric labels and cardinality
- Python-style illustrative examples
- Mermaid diagrams

## Sources Consulted
- Prometheus metric and label naming best practices: https://prometheus.io/docs/practices/naming/
- Prometheus data model: https://prometheus.io/docs/concepts/data_model/
- Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/
- OpenTelemetry semantic convention naming: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry HTTP metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry database metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- OpenTelemetry Prometheus/OpenMetrics compatibility: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/

## Issues Found
- The structure breakdown listed `total` as a unit for counts. Prometheus treats `total` as the suffix for unitless accumulating counters, not as a measurement unit, so the unit examples were changed to `seconds`, `bytes`, and `ratio`.
- The suffix examples described `bucket` only as a histogram suffix. In Prometheus, `_bucket` is a series suffix produced by classic histograms, so the wording was clarified.
- The base-unit comment recommended `fahrenheit` and rejected `kelvin`. Prometheus recommends `celsius` as the general temperature unit and allows `kelvin` for special absolute-temperature cases, so the comment was corrected.
- The Prometheus summary example omitted `_sum` and `_count`. Prometheus summaries expose quantile series plus `_sum` and `_count`, so the comment was updated.
- The OpenTelemetry database examples used the outdated/non-current `db.system` attribute and attached it to `db.client.connection.count`. Current database conventions use `db.system.name` for operation duration, while connection-count requires `db.client.connection.pool.name` and `db.client.connection.state`; the examples were corrected.

## Review Notes
OpenTelemetry semantic conventions intentionally use dotted names and generally do not append units or `_total` to metric names, while Prometheus best practices strongly recommend unit and type suffixes. The post now remains accurate as a cross-system guide, but future revisions could call out this difference more explicitly.
