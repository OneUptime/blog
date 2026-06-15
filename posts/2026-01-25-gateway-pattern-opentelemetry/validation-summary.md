# Validation Summary: How to Configure Gateway Pattern in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector agent-to-gateway deployment pattern
- OTLP receivers and exporters
- Collector processors: memory limiter, batch, resource, filter, tail sampling
- Collector load balancing exporter
- Collector persistent queue and file storage extension
- Kubernetes DaemonSet, Deployment, Service, headless Service, and pod anti-affinity
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector load balancing exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector OTLP receiver configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/config.md
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes pod affinity and anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The agent exporter pointed to `gateway-collector.observability.svc.cluster.local`, but the Kubernetes Service in the post is named `otel-gateway`. Updated the endpoint to `otel-gateway.observability.svc.cluster.local:4317`.
- Environment variable examples used `${VAR}`. Updated Collector config examples to the current documented `${env:VAR}` form.
- The filter processor example used the older nested `traces.span` form and the older HTTP semantic attribute `http.target`. Updated it to current `trace_conditions` syntax with `span.attributes["url.path"]`.
- The post could imply Kubernetes Service load balancing is suitable for gateway tail sampling. Added a note that multi-replica tail sampling needs trace-ID load balancing, and clarified that default Service load balancing is only appropriate for stateless processing.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current Prometheus pull reader configuration.
- The monitoring table listed `otelcol_processor_dropped_spans`, which is not in the current upstream internal metrics list. Replaced it with `otelcol_exporter_enqueue_failed_spans`.
- The final scalability sentence overclaimed guaranteed capacity. Reworded it to a sizing-and-tuning-dependent statement.

## Review Notes
The full agent and gateway Collector configuration snippets were validated with `otel/opentelemetry-collector-contrib:latest` using `otelcol-contrib validate`. The scaling table remains a rough sizing guide, not a guaranteed benchmark; actual capacity depends on signal shape, processor choices, backend latency, queue settings, and resource limits.
