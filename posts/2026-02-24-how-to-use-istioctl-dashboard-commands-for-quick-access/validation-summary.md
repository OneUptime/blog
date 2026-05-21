# Validation Summary: How to Use istioctl Dashboard Commands for Quick Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- Kiali
- Grafana
- Prometheus
- Jaeger
- Zipkin
- Envoy proxy admin interface
- Istio Telemetry API

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Jaeger integration documentation: https://istio.io/latest/docs/ops/integrations/jaeger/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio Zipkin tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Kiali task and integration documentation: https://istio.io/latest/docs/tasks/observability/kiali/ and https://istio.io/latest/docs/ops/integrations/kiali/

## Issues Found
- The addon install commands used the old `release-1.20` branch. Updated the remote sample manifest URLs to `release-1.30`, matching the current Istio documentation version.
- The Jaeger tracing configuration only used legacy `defaultConfig.tracing.sampling`. Updated it to configure a Jaeger extension provider and enable it with the `telemetry.istio.io/v1` Telemetry API, including `randomSamplingPercentage`.
- The Envoy dashboard examples used `istioctl dashboard envoy`, which current Istio docs mark as deprecated. Updated the examples to `istioctl dashboard proxy` and noted that `envoy` is a deprecated alias for sidecar Envoy admin access.
- The custom service name example used `--service-name`, which is not a current `istioctl dashboard` flag. Removed that example and kept the supported namespace example.
- The final install section said "open everything" while showing only `istioctl dashboard kiali`. Changed the wording to "open a dashboard."

## Review Notes
- The sample addon manifests are still correctly described as demonstration-oriented and not hardened for production.
- `kubectl` and `istioctl` were not installed locally, so CLI verification was performed against official Istio command documentation and official sample manifest URLs.
