# Validation Summary: How to Configure the OpenTelemetry Collector to Enrich Logs with Trace Context

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry log trace context
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Attributes processor
- Resource processor
- Filelog receiver and Stanza parser operators
- OTLP gRPC and OTLP HTTP exporters
- Grafana Tempo and Grafana Loki OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector connectors list — https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Logs Data Model — https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Transform Processor documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL Log Context documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry OTTL Span Context documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OpenTelemetry Attributes Processor documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Resource Processor documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Filelog Receiver documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Stanza json_parser documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Stanza regex_parser documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Stanza trace_parser documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/trace_parser.md
- OpenTelemetry OTLP gRPC Exporter documentation — https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- Grafana Loki OpenTelemetry Collector ingestion documentation — https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API OTLP endpoint documentation — https://grafana.com/docs/loki/latest/api/#ingest-logs-using-otlp

## Issues Found

1. **The post described a non-existent generic `correlation` connector.** The official Collector connectors list does not include a connector that matches logs to spans by `request_id` and writes trace IDs into logs. Replaced that section with a supported pattern: standardizing `correlation.request_id` on spans and logs for backend correlation.

2. **The introduction and problem statement overstated Collector enrichment capabilities.** The original wording claimed the Collector could infer missing trace IDs from matching spans. Updated the text to clarify that the Collector can set OTLP log trace fields when valid trace context is already present in a non-standard log field, and can standardize shared correlation attributes.

3. **Transform processor examples used outdated/unprefixed OTTL log paths.** Current OTTL documentation for Collector versions 0.120.0 and later documents paths such as `log.trace_id.string`, `log.span_id.string`, `log.attributes`, and `log.body.string`. Updated all transform snippets to use current log and span context paths.

4. **Loki exporter configuration used the gRPC `otlp` exporter for an HTTP OTLP endpoint.** Grafana Loki documentation requires the `otlphttp` exporter with `endpoint: http://<loki-addr>/otlp`. Updated log exporters and log pipeline references to `otlphttp/logs`.

5. **Tempo OTLP gRPC exporter endpoint included an HTTP scheme.** The Collector OTLP gRPC exporter documentation expects a gRPC target such as `host:port` unless using specific gRPC URI syntax. Updated Tempo examples to `endpoint: "tempo:4317"` with `tls.insecure: true`.

6. **The final production configuration claimed support for legacy logs without trace context.** Without an existing trace ID or span ID in the log data, the shown Collector config cannot create true OTLP trace context. Updated the claim to legacy file logs that carry trace IDs in fields, and added a request ID attributes processor for backend correlation when trace context is absent.

## Review Notes
- The examples assume the contrib or Kubernetes Collector distribution because `filelog` and `transform` are contrib/K8s components, while `attributes`, `resource`, `batch`, `otlp`, and `otlphttp` are available in core distributions.
- The examples use `error_mode: ignore` for transform processors so malformed trace IDs do not drop log payloads. In production, invalid trace ID rates should still be monitored.
- Shared request IDs are useful for querying and backend-side correlation, but they are not a substitute for valid OTLP `TraceId` and `SpanId` fields when direct trace-to-log navigation is required.
