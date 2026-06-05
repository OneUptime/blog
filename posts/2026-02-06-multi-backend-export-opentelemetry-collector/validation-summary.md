# Validation Summary: How to Set Up Multi-Backend Export from a Single OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector pipelines
- OpenTelemetry Collector exporters
- OpenTelemetry Collector processors
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector internal telemetry
- Grafana Loki OTLP log ingestion
- Prometheus remote write
- Jaeger OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector architecture documentation: https://opentelemetry.io/docs/collector/architecture/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector exporterhelper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Jaeger API documentation for OTLP ingestion: https://www.jaegertracing.io/docs/1.76/apis/

## Issues Found
- The first Collector configuration used `${VENDOR_API_KEY}` for environment substitution. Current Collector documentation shows the `${env:VENDOR_API_KEY}` form, so the header value was updated.
- The first Collector configuration used the OTLP gRPC exporter for Loki. Grafana Loki documentation states that Loki's native OTLP ingestion endpoint uses OTLP over HTTP with the `otlphttp` exporter, so the exporter was changed to `otlphttp/loki` with `endpoint: http://loki:3100/otlp`.
- The routing connector example used `statement: route() where ...`, which does not match the current routing connector examples. It was updated to use `context: resource` and `condition: attributes[...] == ...`.
- The internal telemetry example used `service.telemetry.metrics.address`, which OpenTelemetry documents as ignored as of Collector v0.123.0. It was updated to the current `readers.pull.exporter.prometheus.host` and `port` configuration.
- The internal Prometheus scrape target used `0.0.0.0:8888`, which is a bind address rather than a scrape target. It was changed to `127.0.0.1:8888`.

## Review Notes
The pipeline fan-out, shared receiver behavior, processor examples, retry and sending queue fields, attributes processor actions, and key Collector internal metrics are consistent with current documentation. The review environment did not have `otelcol` or `otelcol-contrib` installed, so I could not run Collector schema validation; all YAML snippets were parsed successfully with PyYAML.
