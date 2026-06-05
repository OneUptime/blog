# Validation Summary: How to Troubleshoot Collector CPU Spikes That Cause 100% Utilization

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector pprof and zPages extensions
- OpenTelemetry Collector batch, attributes, memory_limiter, filter, transform, and resource processors
- OpenTelemetry OTLP receiver
- OpenTelemetry Collector load balancing exporter
- Kubernetes Deployments and Services
- Prometheus alerting rules

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector pprof extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/pprofextension/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector gRPC configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector load balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The pprof example did not actually enable pprof; it only configured telemetry metrics and logs. I changed it to configure and enable the `pprof` extension and kept the internal metrics endpoint on the current `service.telemetry.metrics.readers` schema.
- The internal metrics example used `service.telemetry.metrics.address`, which OpenTelemetry documents as ignored as of Collector v0.123.0. I replaced it with the current Prometheus pull reader configuration.
- The zPages description claimed `/debug/tracez` showed pipeline stats. Official troubleshooting docs describe TraceZ as useful for trace operations such as latency, running spans that do not end, and errors, so I updated the wording.
- The attributes processor `extract` example used an unnamed capture group. Official docs require named submatchers, so I changed the regex to use `(?P<http_path>...)`.
- The Kubernetes Deployment example omitted the required `spec.selector` and matching pod labels needed by the Deployment and Service. I added `app: otel-collector` labels and selector.
- The load balancing exporter example used the deprecated `loadbalancing` component name. Official docs now use `load_balancing`, with the old name preserved as a deprecated alias, so I updated the exporter and pipeline reference.
- The CPU alert used `process_cpu_seconds_total`, which is not the Collector internal metric name under the documented Collector metric naming scheme used in the post. I changed it to `otelcol_process_cpu_seconds` and configured the Prometheus reader to avoid unit/type suffixes.
- The refused spans alert used `otelcol_processor_refused_spans`, but official internal telemetry docs list refused spans at the receiver as `otelcol_receiver_refused_spans`. I updated the alert expression.

## Review Notes
The OTLP receiver gRPC fields shown are valid server configuration settings. The specific Collector image tag in the Kubernetes snippet, `otel/opentelemetry-collector-contrib:0.121.0`, is older than the latest Collector release, but the surrounding guidance is not tied to that exact version.
