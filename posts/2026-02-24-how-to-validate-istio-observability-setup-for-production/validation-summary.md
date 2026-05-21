# Validation Summary: How to Validate Istio Observability Setup for Production

## Status
validated

## Post Type
Tutorial / Production validation guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus
- Prometheus Operator
- Grafana
- Distributed tracing with Zipkin/Jaeger-style backends
- Istio Telemetry API
- IstioOperator configuration
- Envoy access logging

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio Zipkin tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio trace sampling task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio access logs with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio application requirements / sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio secure metrics scraping task: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction said teams get distributed tracing and access logs without modifying application code. I changed this to say they can get tracing and access logs without modifying application instrumentation, because applications still need to propagate trace context headers for complete traces.
- The metrics checks treated port 15090 as the default Istio workload metrics endpoint. I updated the text and commands to use port 15020 for merged Istio, Envoy, and application metrics, while noting that 15090 is the Envoy-only metrics port.
- The troubleshooting bullets only mentioned network policy blocks on port 15090. I updated them to cover both 15020 and 15090.
- The trace propagation header list omitted the B3 single-header format. I added `b3`, matching Istio's distributed tracing FAQ.
- The trace test used `x-request-id` as though it were a trace ID. I replaced it with valid B3 trace headers and clarified that W3C `traceparent` should be used instead when the mesh/backend is configured for W3C propagation.
- The IstioOperator tracing example used legacy sampling under `defaultConfig.tracing`. I updated it to the current extension-provider pattern with `enableTracing: true` and `defaultConfig.tracing: {}`, while leaving sampling in the Telemetry API example already shown earlier.
- The access log filter used `response.code >= 400` only. I updated it to `!has(response.code) || response.code >= 400` so connection failures without a response code are still logged, as recommended by Istio's Telemetry API access log documentation.

## Review Notes
The Prometheus Operator `PodMonitor` snippet is structurally valid, but in real clusters Prometheus must also be configured to select PodMonitors in the `monitoring` namespace. The Grafana dashboard IDs are still listed by Istio, although Istio's current import loop includes additional dashboards beyond the four shown in the post.
