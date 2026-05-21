# Validation Summary: How to Follow Istio Observability Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Prometheus and PromQL
- Grafana
- Kiali
- OpenTelemetry tracing
- Envoy access logs
- Kubernetes kubectl

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio access logging with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl and exported control-plane metrics reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Kiali integration documentation: https://istio.io/latest/docs/ops/integrations/kiali/
- Prometheus configuration documentation for exemplars: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The access log filter compared `response.duration` to the integer `5000`. Istio access log filters use CEL expressions over attributes, and `response.duration` is a duration value, so the filter was changed to compare against `duration("5s")`.
- The control-plane metrics list described connected proxies but named `pilot_xds_pushes`. The Istio control-plane metric for connected XDS endpoints is `pilot_xds`, so the metric name was corrected.
- The convergence-time alert passed raw bucket series directly into `histogram_quantile`. The PromQL was changed to aggregate bucket rates by `le`, which is the expected shape for histogram quantile calculations.
- The Grafana and Kiali addon commands referenced Istio `release-1.24`, which is no longer supported. The URLs were updated to `release-1.30`, a supported release as of the validation date.
- The metrics-to-traces correlation section said the Istio tracing snippet set up Prometheus exemplars. That snippet enables tracing/sampling rather than exemplar storage, so the wording was corrected to say it enables tracing for metric-to-trace linking.

## Review Notes
- The Istio sample addon manifests are useful for quick starts but are not tuned for production security or performance. Production installations should use supported, maintained Grafana/Kiali deployment methods.
- The tracing provider names in Telemetry resources must match providers configured in `meshConfig.extensionProviders`; the examples assume matching providers already exist.
