# Validation Summary: How to Estimate Telemetry Data Volume for Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio telemetry
- Istio Telemetry API
- Envoy sidecar metrics and access logs
- Prometheus and PromQL
- Distributed tracing with Zipkin, Jaeger, and Tempo
- Loki and Elasticsearch log storage

## Sources Consulted
- Istio Observability concepts: https://istio.io/latest/docs/concepts/observability/
- Istio Configure trace sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Zipkin tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Configure access logs with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Secure Prometheus scraping task: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Jaeger performance tuning guide: https://www.jaegertracing.io/docs/1.76/performance-tuning/

## Issues Found
- The access logging example used `apiVersion: networking.istio.io/v1` for a `Telemetry` resource. Istio Telemetry resources use the `telemetry.istio.io/v1` API group, so the snippet was updated.
- The trace sampling example used only `meshConfig.defaultConfig.tracing.sampling` with an extension provider. Current Istio documentation encourages the Telemetry API for tracing configuration and shows provider selection separately from the extension provider definition, so the snippet was updated to define the Zipkin extension provider and set `randomSamplingPercentage` on a `telemetry.istio.io/v1` `Telemetry` resource.
- The explanatory sentence after the trace sampling snippet referred to `sampling`. It was updated to `randomSamplingPercentage` to match the corrected Telemetry API example.

## Review Notes
The sizing numbers for traces, logs, and backend resources are estimates rather than fixed product guarantees. Prometheus disk estimates are consistent with the official 1-2 bytes per sample rule of thumb, but real storage can vary with labels, WAL size, retention settings, remote write, and backend compression.
