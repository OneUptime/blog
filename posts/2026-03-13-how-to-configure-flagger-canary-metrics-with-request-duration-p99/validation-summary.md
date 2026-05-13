# Validation Summary: How to Configure Flagger Canary Metrics with Request Duration P99

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flagger
- Kubernetes Canary custom resources
- Flagger MetricTemplate custom resources
- Prometheus and PromQL
- Istio telemetry metrics
- Linkerd proxy metrics

## Sources Consulted
- Flagger Metrics Analysis documentation: https://fluxcd.io/flagger/usage/metrics/
- Flagger How It Works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Upgrade Guide, Istio telemetry v2 notes: https://docs.flagger.app/main/dev/upgrade-guide
- Linkerd Proxy Metrics reference: https://linkerd.io/2.15/reference/proxy-metrics/

## Issues Found
- The post incorrectly stated that the Flagger `{{ target }}` MetricTemplate variable resolves to the canary workload name with a `-canary` suffix. Flagger documents `target` as `canary.spec.targetRef.name`, so the wording was corrected to avoid implying that Flagger appends `-canary` to this variable.

## Review Notes
- The Flagger examples use the current `flagger.app/v1beta1` API and `thresholdRange` fields.
- Flagger's built-in `request-duration` metric is documented as request duration P99 in milliseconds.
- The Istio custom query uses `istio_request_duration_milliseconds_bucket`, which matches Istio telemetry v2 guidance for millisecond thresholds.
- The Linkerd query uses `response_latency_ms_bucket`, consistent with Linkerd's documented response latency histogram. The exact label set can vary with the Linkerd/Prometheus scraping setup, but the metric name and general PromQL pattern are valid.
