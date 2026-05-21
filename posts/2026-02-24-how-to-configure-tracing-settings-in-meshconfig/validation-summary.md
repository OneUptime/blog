# Validation Summary: How to Configure Tracing Settings in MeshConfig

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio MeshConfig
- Istio Telemetry API
- IstioOperator
- Envoy sidecar tracing
- Zipkin
- Jaeger
- OpenTelemetry Collector and OTLP
- Kubernetes pod annotations
- Python Flask header propagation example

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio configure trace sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio configure tracing using MeshConfig and pod annotations: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig tracing reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#Tracing
- Istio Zipkin tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The Telemetry resources used `apiVersion: telemetry.istio.io/v1alpha1`. Updated them to the current documented `telemetry.istio.io/v1` API version.
- The Zipkin provider example used legacy `defaultConfig.tracing.zipkin.address` configuration. Updated it to the current `meshConfig.extensionProviders[].zipkin` pattern and added the Telemetry resource needed to activate the provider.
- The OpenTelemetry provider example mixed Telemetry API sampling with `defaultConfig.tracing.sampling`. Updated the provider install example to use `tracing: {}` and leave sampling to the Telemetry resource, matching current Istio guidance.
- The Jaeger section stated broadly that Jaeger is Zipkin-compatible. Updated it to use the current Istio OpenTelemetry-based Jaeger configuration and made the Zipkin path conditional on a Jaeger deployment explicitly exposing a Zipkin-compatible collector.
- The per-workload sampling paragraph implied a pod annotation always wins. Added a caveat that Telemetry API sampling has higher precedence than pod annotations.
- The W3C trace-context sentence implied OpenTelemetry exclusively uses W3C headers. Reworded it to say W3C Trace Context is commonly used with OpenTelemetry.

## Review Notes
The remaining MeshConfig tracing fields, sampling percentages, `proxy.istio.io/config` annotation shape, custom Telemetry tags, trace header propagation guidance, Python header-forwarding example, and `istioctl proxy-config bootstrap` command are consistent with current Istio documentation. MeshConfig and pod-annotation tracing remain supported, but Istio documentation encourages moving tracing configuration to the Telemetry API where possible.
