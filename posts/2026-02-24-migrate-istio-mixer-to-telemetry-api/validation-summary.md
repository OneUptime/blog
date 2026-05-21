# Validation Summary: How to Migrate from Istio Mixer to Telemetry API

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio Mixer
- Istio Telemetry API
- Envoy access logs
- Prometheus metrics
- Zipkin tracing
- OpenTelemetry tracing
- Kubernetes kubectl commands
- IstioOperator mesh configuration

## Sources Consulted
- Istio FAQ: https://istio.io/latest/about/faq/
- Istio 1.8 release announcement: https://istio.io/latest/news/releases/1.8.x/announcing-1.8/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio tracing with Telemetry API task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- The post said Mixer was removed in Istio 1.12. Official Istio documentation says Mixer was removed in Istio 1.8, so the version was corrected.
- The introduction said all Mixer functionality was replaced by the Telemetry API and Envoy-native extensions. This was narrowed to telemetry functionality because non-telemetry Mixer adapters, such as policy adapters, have separate migration paths.
- The performance section gave a specific 5-10 ms latency figure without official support. It was changed to a general statement that Mixer checks or reports added latency.
- The metric disabling example used `REQUEST_BYTES` and `RESPONSE_BYTES`, which are not valid `IstioMetric` enum names in the v1 Telemetry API. They were changed to `REQUEST_SIZE` and `RESPONSE_SIZE`.
- The access log format example set `accessLogEncoding: JSON` while using a plain text access log format. It was changed to `TEXT`.
- The migration steps implied current Telemetry API resources and Mixer resources can coexist temporarily. Since Mixer resources are not served by current Istio versions, the step was changed to recommend staging or revision-based upgrade validation.

## Review Notes
The post now uses the current `telemetry.istio.io/v1` API, which is appropriate for modern Istio releases. For older upgrade paths, especially pre-1.22 installations, readers may need to account for the historical `v1alpha1` Telemetry API before moving to current Istio versions.
