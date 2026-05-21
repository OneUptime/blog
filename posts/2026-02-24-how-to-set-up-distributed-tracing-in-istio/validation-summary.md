# Validation Summary: How to Set Up Distributed Tracing in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- Distributed tracing
- Jaeger
- OpenTelemetry / OTLP
- Zipkin B3 and W3C Trace Context headers
- Kubernetes
- Python Flask and Requests
- Go net/http

## Sources Consulted
- Istio Jaeger task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio trace sampling task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Jaeger integration docs: https://istio.io/latest/docs/ops/integrations/jaeger/
- Jaeger getting started docs: https://www.jaegertracing.io/docs/1.76/getting-started/
- Jaeger Operator repository documentation: https://github.com/jaegertracing/jaeger-operator

## Issues Found
- The Jaeger install command applied `jaeger-operator`'s `examples/simplest.yaml` directly. That file is a Jaeger custom resource and requires the operator/CRD to be installed first. Replaced it with Istio's official Jaeger sample add-on for a quick demo and kept the all-in-one manifest as the development path used by the rest of the guide.
- The custom Jaeger deployment used `jaegertracing/all-in-one:1.54`. Updated it to `jaegertracing/all-in-one:1.76.0`, matching the current Jaeger 1.x getting started documentation.
- The Istio tracing provider was configured as a Zipkin provider against Jaeger's Zipkin-compatible port. Current Istio Jaeger documentation uses an OpenTelemetry provider targeting OTLP gRPC on port 4317, so the mesh config and `istioctl` example were updated.
- Added `defaultConfig.tracing: {}` to the IstioOperator example to disable legacy MeshConfig tracing options, matching the current Istio tracing examples.
- The B3 compact `b3` header was missing from the propagation list. Added it to the header list and Python/Go examples because Istio's tracing FAQ includes it for Zipkin/B3 propagation.
- The Bookinfo verification command used an outdated Istio release URL and assumed the `sleep` workload already existed. Updated sample URLs to `release-1.29` and added the sleep sample deployment before using `kubectl exec deploy/sleep`.
- The troubleshooting command attempted to run `curl` inside the `istio-proxy` container. Updated the backend reachability check to use the sleep workload and the Envoy stats check to use `pilot-agent request GET stats`, which is available in the proxy container.
- The Kubernetes service port names for OTLP and Zipkin were adjusted to protocol-prefixed names such as `grpc-otlp` and `http-zipkin`, matching Istio port naming conventions.
- The sampling explanation said `100` means every request gets traced. Updated it to clarify that `randomSamplingPercentage` applies when no prior sampling decision is present.

## Review Notes
- The manual header propagation examples are syntactically valid, but production applications should prefer OpenTelemetry propagation libraries where possible.
- The all-in-one Jaeger deployment remains appropriate only for development and demos, not production storage or security.
