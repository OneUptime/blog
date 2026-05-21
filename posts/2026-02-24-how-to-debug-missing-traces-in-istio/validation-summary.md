# Validation Summary: How to Debug Missing Traces in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio distributed tracing
- Istio Telemetry API
- Istio MeshConfig extension providers
- Envoy tracing and tracing statistics
- Zipkin
- Jaeger
- OpenTelemetry Collector
- Kubernetes kubectl commands

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio trace sampling guide: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio Zipkin tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP connection manager tracing statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The backend connectivity examples used `curl` inside the `istio-proxy` container. Current Istio proxy images should not be assumed to include troubleshooting tools, so the examples now run from an application container in the same workload pod that has `curl` or `nc`.
- The Jaeger connectivity example used port `9411`, which is Zipkin's common port and not the current Istio Jaeger tracing example. Updated it to check the Jaeger collector on OTLP/gRPC port `4317`, matching Istio's current Jaeger task.
- The sampling explanation implied a generic default of 0. Updated it to reflect the Telemetry API behavior: `randomSamplingPercentage` defaults to 0% when no prior sampling decision is present.
- The force-trace example used a B3 sampling header without stating the propagation assumption. Clarified that it applies when using B3 propagation.
- The httpbin header echo check implied B3 headers are always added. Clarified that this expectation applies when B3 propagation is in use.
- The Envoy tracing stats were listed as bare `tracing.*` counters. Updated them to the documented `http.<stat_prefix>.tracing.*` naming.
- The protocol mismatch section stated that the Zipkin provider always generates B3 and OpenTelemetry always generates `traceparent`. Updated the text to note Zipkin's default B3 behavior and current `traceContextOption` support for B3 plus W3C propagation, and to require W3C forwarding for OpenTelemetry.

## Review Notes
The commands are intentionally generic and still require replacing placeholder names such as `my-service`, `my-namespace`, and container names with real workload values. The post does not specify an Istio version; the review used the current Istio documentation as of 2026-05-21.
