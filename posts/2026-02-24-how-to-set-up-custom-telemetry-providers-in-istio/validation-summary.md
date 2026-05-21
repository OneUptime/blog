# Validation Summary: How to Set Up Custom Telemetry Providers in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Istio MeshConfig extension providers
- OpenTelemetry Collector
- Kubernetes Deployments, Services, and ConfigMaps
- Envoy access logging
- Jaeger / Zipkin-style tracing backends

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task guide: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio OpenTelemetry tracing task guide: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio trace sampling task guide: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio OpenTelemetry access log provider task guide: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio MeshConfig / ExtensionProvider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The tracing provider examples defined `extensionProviders` but did not set `meshConfig.enableTracing: true`. Istio's current tracing examples include this setting when enabling trace generation with Telemetry API provider selection and sampling, so it was added to the IstioOperator snippets that configure tracing providers.
- The introduction implied Istio telemetry providers can send metrics directly to Datadog. The current MeshConfig provider model has Datadog as a tracing provider and Prometheus as the primary metrics provider, so the wording was changed to traces for Jaeger or Datadog and metrics for Prometheus-compatible backends.
- The provider list was worded as exhaustive but omitted supported provider types such as `datadog`. The wording was changed to "Common telemetry provider types include" and `datadog` was added as a tracing provider.
- The multiple-provider tracing example listed both `otel-tracing` and `custom-zipkin` in one tracing rule. Istio's Telemetry API currently allows only a single provider in a given tracing rule, so the example was changed to use one tracing provider and the text now explains that multiple simultaneous providers are appropriate for access logging, while tracing should be separated by namespace or workload scope.
- The collector verification command grepped specifically for `TracesExporter`, which is not guaranteed for the shown Collector configuration. It was replaced with a more general log check for exporter activity, warnings, or errors.

## Review Notes
- The OpenTelemetry Collector image tag `0.92.0` is old, but the configuration shape shown remains consistent with the Collector configuration model. Future updates could refresh the image tag to a newer tested Collector release.
- `kubectl` and `istioctl` were not installed in the local review environment, so command validation was performed against official Kubernetes/Istio command usage patterns and Istio documentation rather than local CLI help output.
