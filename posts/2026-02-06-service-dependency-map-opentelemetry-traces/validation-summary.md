# Validation Summary: Build a Platform-Wide Service Dependency Map from OpenTelemetry Trace Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Collector connectors
- OpenTelemetry semantic conventions
- Python
- Mermaid
- Kubernetes CronJob
- Trace backend query APIs

## Sources Consulted
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector `service_graph` connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/README.md
- OpenTelemetry Collector `span_metrics` connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry semantic convention registry for `otel.status_code`: https://opentelemetry.io/docs/specs/semconv/registry/attributes/otel/
- Jaeger API documentation: https://www.jaegertracing.io/docs/2.1/apis/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post incorrectly described the `spanmetrics` connector as producing source-to-destination dependency edges. The current OpenTelemetry Collector component intended for service dependency maps is `service_graph`, which pairs client/server and producer/consumer spans and emits service graph metrics. I changed the section title, Collector configuration, and metric names accordingly.
- The post said every span records the calling service and called service. A span records the service that produced it; dependencies are inferred by pairing spans or using attributes such as `peer.service`. I revised the explanation to match the OpenTelemetry trace model.
- The span relationship explanation was too absolute. Client spans usually become parents of remote server spans when context propagation succeeds, but this can vary with messaging and instrumentation. I softened the wording.
- The Python section described an "OTLP-compatible backend" as if OTLP implied a query API. OTLP is primarily an ingest/export protocol, while trace querying is backend-specific. I changed the wording to "trace backend query API."
- The Python code built an unused `span_index` and passed it into `resolve_target_from_children`. I removed the unused variable and parameter.
- The Mermaid generator only replaced hyphens in service names, which was not a robust sanitized ID. I added a small regex-based helper for Mermaid-safe node IDs.
- The Mermaid example showed a 0.3% error label even though the code only emitted error labels when the error rate was greater than 1%. I changed the condition to emit labels for any nonzero error rate.
- The closing claim said a trace-derived map is "always accurate." I changed it to note that accuracy depends on sampling, instrumentation coverage, and whether both sides of requests are captured.

## Review Notes
The example trace fetching code is intentionally backend-specific pseudocode and still needs adaptation for a real backend such as Jaeger, Tempo, or another trace store. Jaeger also exposes an internal `/api/dependencies` endpoint, but the post's direct-span-processing approach remains valid as an implementation pattern.
