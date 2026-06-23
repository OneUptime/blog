# Validation Summary: How to Build Advanced OpenTelemetry Collector Pipelines

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib processors, exporters, receivers, and connectors
- OTLP, Kafka, Prometheus, Prometheus Remote Write, Loki OTLP ingestion
- OTTL transform and filter expressions
- Tail-based sampling and load-balancing pipelines

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- OpenTelemetry Collector Contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector Contrib span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector Contrib resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Local validation with `otel/opentelemetry-collector-contrib:latest` (`otelcol-contrib` v0.153.0) using `validate`.

## Issues Found
- Updated deprecated `resourcedetection` processor examples to `resource_detection`, and removed invalid/deprecated Kubernetes detector usage from generic examples.
- Fixed Kafka exporter trace topic and encoding configuration by nesting them under `traces`, matching the current Kafka exporter schema.
- Added required `check_interval` values to `memory_limiter` examples that otherwise fail Collector validation.
- Updated count connector custom metric examples to use current `spans` / `spanevents` metric-name map keys.
- Updated `spanmetrics` connector examples to `span_metrics`, the current non-deprecated connector type, and removed duplicate `service.name` from custom dimensions where it is already a default dimension.
- Replaced invalid OTTL examples: changed `Time()` calls to `Now()`, changed regex operator examples to `IsMatch(...)`, and changed `limit(attributes, 50)` to `limit(attributes, 50, [])`.
- Fixed routing connector examples by adding explicit `resource` and `span` contexts and using `condition` entries, so span status routing is evaluated in the correct OTTL context.
- Fixed the load-balancing exporter DNS resolver port value from an integer to the required string.
- Replaced deprecated/removed Loki exporter configuration with Loki's native OTLP ingestion via `otlphttp/loki`.
- Replaced deprecated internal telemetry `metrics.address` examples with `readers` using a `pull` Prometheus exporter.

## Review Notes
All YAML snippets in the post were extracted and validated with the current OpenTelemetry Collector Contrib image. The load-balancing section contains two separate Collector configs in one fenced block; each document was validated separately.
