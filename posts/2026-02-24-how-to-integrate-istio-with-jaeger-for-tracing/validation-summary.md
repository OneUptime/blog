# Validation Summary: How to Integrate Istio with Jaeger for Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Jaeger
- Envoy
- OpenTelemetry Protocol
- Kubernetes
- Distributed tracing
- Python Flask

## Sources Consulted
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio trace sampling task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Jaeger integration docs: https://istio.io/latest/docs/ops/integrations/jaeger/
- Jaeger latest documentation and v2 Kubernetes deployment notes: https://www.jaegertracing.io/docs/
- Jaeger Kubernetes Operator archive: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger Operator GitHub releases: https://github.com/jaegertracing/jaeger-operator/releases
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- Updated Istio sample URLs from `release-1.20` to `release-1.30` so the guide matches the current Istio documentation and available sample manifests.
- Replaced the older Zipkin-style Istio tracing provider configuration with the current Jaeger task's OpenTelemetry provider configuration using OTLP/gRPC on port `4317`.
- Clarified that traces are generated for sampled requests, not automatically for every request unless sampling is configured to 100%.
- Changed the Telemetry API wording from an optional preference to the current way the guide enables tracing and sampling.
- Fixed the test traffic command by deploying Istio's `curl` sample and using `kubectl exec deploy/curl -c curl`; the original command used `deploy/sleep` without creating a `sleep` deployment.
- Updated the Jaeger Operator production section to call out that Jaeger v2 Kubernetes deployment guidance now points to OpenTelemetry Operator or Helm, while the `jaegertracing.io/v1` examples are Jaeger v1 Operator examples.
- Replaced the Jaeger Operator install URL with a reachable `v1.65.0` manifest URL. The previously shown `v1.51.0` was old, and the Jaeger docs' generated `v1.76.0` operator URL currently returns 404.
- Clarified that custom tags appear on every reported span, not on unsampled requests that do not produce reported spans.

## Review Notes
- The Jaeger Operator custom resources are v1-era examples. They remain useful for legacy Jaeger Operator deployments, but future updates should consider replacing that production section with a Jaeger v2/OpenTelemetry Operator or Helm-based deployment.
- `istioctl` and `kubectl` were not installed in this local environment, so CLI syntax was checked against official documentation and referenced manifests were checked with HTTP requests rather than executed against a cluster.
