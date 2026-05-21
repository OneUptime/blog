# Validation Summary: How to Optimize Istio Metrics Storage Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar telemetry
- Istio Telemetry API
- Envoy proxy metrics
- Prometheus scrape configuration and recording rules
- Thanos sidecar and object storage
- Amazon S3 storage pricing

## Sources Consulted
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Customizing Metrics with Telemetry API task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Classifying Metrics Based on Request or Response task: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Thanos sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- The post stated that Envoy exposes a large number of internal metrics by default and that `proxyStatsMatcher` limits the full default set. Current Istio documentation says Istio configures Envoy to record a minimal default set and `proxyStatsMatcher` is used to enable additional matched stats. Updated the wording so the guidance applies when extra Envoy stats have been enabled.
- The Telemetry examples used `apiVersion: telemetry.istio.io/v1alpha1`. Current Istio documentation uses `telemetry.istio.io/v1`. Updated the examples to the current API version.
- The post claimed `response_code_class` is a default Istio label. Istio's standard metrics reference lists `response_code`, but not `response_code_class`. Updated the text to explain that status classes must be produced by recording rules or Istio response classification.
- The recording rule grouped by `response_code_class` without defining that label. Updated the PromQL to derive `response_code_class` with `label_replace()` from `response_code`.
- The post implied vanilla Prometheus can retain raw metrics briefly while retaining recording rules for longer in the same TSDB. Prometheus retention is TSDB-wide. Updated the wording to point to a long-term backend, remote-write pipeline, or separate Prometheus setup for different retention policies.
- The expected savings table said disabling unused Envoy stats generally reduces all time series by 40-60%. Updated the wording to clarify this applies to Envoy time series when extra stats were previously enabled.

## Review Notes
The Prometheus scrape configuration, metric relabeling structure, Thanos sidecar flags, and core Istio Telemetry override structure are consistent with current official documentation. The savings numbers are plausible rules of thumb, but actual reductions depend heavily on workload count, traffic shape, enabled Envoy stats, scrape interval, and backend retention model.
