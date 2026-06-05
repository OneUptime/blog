# Validation Summary: How to Set Up OTel Arrow for Multi-Signal Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol with Apache Arrow / OTel Arrow
- OTLP over gRPC and HTTP
- Apache Arrow columnar encoding
- Prometheus metrics / PromQL
- Grafana Loki OTLP ingestion

## Sources Consulted
- OpenTelemetry Arrow project README: https://github.com/open-telemetry/otel-arrow
- OpenTelemetry Collector Contrib OTel Arrow exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/otelarrowexporter
- OpenTelemetry Collector Contrib OTel Arrow receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/otelarrowreceiver
- OTel Arrow data model documentation: https://github.com/open-telemetry/otel-arrow/blob/main/docs/data_model.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter component list: https://opentelemetry.io/docs/collector/components/exporter/
- Deprecated Loki exporter migration documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/lokiexporter
- Grafana Loki OpenTelemetry Collector OTLP tutorial: https://grafana.com/docs/loki/latest/send-data/otel/otel-collector-getting-started/

## Issues Found
- The post claimed OTel Arrow multiplexes traces, metrics, and logs over a single shared Arrow stream and shared dictionary. Current Collector OTel Arrow components expose signal-specific Arrow services for traces, metrics, and logs. I changed the description, compression explanation, internal flow section, and stream allocation section to describe signal-specific Arrow streams and per-signal Arrow encoding.
- The receiver example nested `arrow.memory_limit_mib` under `protocols.grpc`. The receiver configuration defines `protocols.arrow.memory_limit_mib`, so I moved the `arrow` block to the correct level under `protocols`.
- The monitoring section referenced a non-documented `otelcol_exporter_otelarrow_compression_ratio` metric. OTel Arrow documents `otelcol_exporter_sent` and `otelcol_exporter_sent_wire`; I replaced the ratio with a PromQL expression using those metrics.
- The receiver-side example used the deprecated/removed `loki` exporter. Current guidance is to export OpenTelemetry logs to Loki through `otlphttp` and Loki's native OTLP endpoint, so I changed the example to `otlphttp/loki`.
- The stream allocation section said all configured streams were shared across all signal types. I changed it to explain that `num_streams` applies to each signal-specific exporter and that separate exporter component IDs are appropriate when tuning per signal.

## Review Notes
The post is now accurate for the current OpenTelemetry Collector Contrib OTel Arrow component behavior. The OTel Arrow exporter and receiver are still beta for traces, metrics, and logs, so future posts should mention version caveats when giving production guidance.
