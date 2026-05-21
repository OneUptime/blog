# Validation Summary: How to Migrate from Legacy Telemetry to Telemetry API in Istio

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig
- Istio EnvoyFilter
- Istio distributed tracing, access logging, and metrics
- Kubernetes kubectl commands
- Envoy access log formatting
- CEL expressions for Istio metric tag overrides

## Sources Consulted
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio access logging with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio metrics customization with Telemetry API task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio custom metrics documentation and CEL notes: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio 1.8 release and upgrade notes for Mixer removal: https://istio.io/latest/news/releases/1.8.x/announcing-1.8/ and https://istio.io/latest/news/releases/1.8.x/announcing-1.8/upgrade-notes/

## Issues Found
- The Telemetry API metric tag override used `request.headers['x-custom'] || 'none'`, which is not a valid CEL fallback for a string value. Changed it to an `in` check with a ternary fallback.
- The migration checklist said to restart all workloads to pick up Telemetry configuration. Telemetry resources are pushed dynamically, so this was changed to say restarts are only needed for cases such as removing pod-level proxy annotations or changing injection-time proxy settings.
- The side-by-side migration section claimed legacy and Telemetry API configurations can coexist generally and are merged with Telemetry API precedence. This was narrowed because Istio documents that Telemetry API metric customization does not work together with EnvoyFilter-based metric customization.
- The validation grep searched for all `defaultConfig` entries, which could produce false positives for unrelated proxy settings. Changed it to look for the specific legacy telemetry fields discussed in the post.

## Review Notes
The post uses current `telemetry.istio.io/v1` examples and valid Telemetry API fields for access logging, tracing, provider references, workload selectors, metric overrides, and sampling. The examples assume an Istio sidecar data plane and a conventional root configuration namespace of `istio-system`.
