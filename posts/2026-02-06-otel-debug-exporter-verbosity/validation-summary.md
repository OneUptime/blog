# Validation Summary: How to Use the Debug Exporter with Verbosity Levels for Step-by-Step Local

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector debug exporter
- OTLP receiver and exporter configuration
- Jaeger OTLP ingestion
- Docker Compose
- Python OpenTelemetry tracing API

## Sources Consulted
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector debug exporter configuration source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/config.go
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector logging exporter replacement announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry network attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/next-release/deployment/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/

## Issues Found
- The post said `normal` is the default debug exporter verbosity. The current OpenTelemetry Collector debug exporter README says the default is `basic`, so the wording was corrected.
- The post described debug exporter output as standard output. The current exporter uses the collector internal logger by default and can be configured with custom output paths only when `use_internal_logger` is false, so the wording was changed to collector log output.
- The `normal` verbosity sample showed detailed-style multiline span fields. It was replaced with a compact normal-style example aligned with the upstream debug exporter examples.
- The detailed span example used deprecated `net.host.name` and `net.host.port` attributes. These were changed to the current HTTP semantic convention attributes `server.address` and `server.port`.
- The metrics section referred to metric labels. OpenTelemetry data points use attributes, so the wording was changed from labels to attributes.
- The production sampling comment said the sample configuration sampled 1% of data. The debug exporter sampling fields sample debug log messages, not telemetry data, and `sampling_thereafter: 500` logs every 500th message after the initial messages. The comment was corrected.

## Review Notes
The debug exporter's output format is explicitly documented as unstable, so exact sample output can change between Collector releases. The Jaeger OTLP endpoint example is valid for Jaeger deployments that expose OTLP gRPC on port 4317.
