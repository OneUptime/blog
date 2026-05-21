# Validation Summary: How to Monitor istio_request_duration_milliseconds Metric

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio standard metrics
- Envoy proxy histograms
- Prometheus and PromQL
- Grafana heatmaps
- Prometheus Operator PrometheusRule resources

## Sources Consulted
- Istio Standard Metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference for `REQUEST_DURATION`: https://istio.io/latest/docs/reference/config/telemetry/
- Istio resource annotations reference for `sidecar.istio.io/statsHistogramBuckets`: https://istio.io/latest/docs/reference/config/annotations/
- Istio proxy implementation recording `istio_request_duration_milliseconds` from Envoy `requestComplete()`: https://github.com/istio/proxy/blob/master/source/extensions/filters/http/istio_stats/istio_stats.cc
- Istio support for `sidecar.istio.io/statsHistogramBuckets`: https://github.com/istio/istio/blob/master/releasenotes/notes/bootstrap-histogram-buckets.yaml
- Envoy Stats configuration default histogram buckets: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/metrics/v3/stats.proto.html
- Prometheus `histogram_quantile()` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule

## Issues Found
- The default histogram bucket list omitted Envoy's `1800000` and `3600000` millisecond bucket boundaries. Updated the list and changed the coverage statement from 600 seconds to 3600 seconds.
- The histogram bucket description used "per bucket", which can imply non-cumulative bucket counts. Updated the wording to say the `_bucket` series are cumulative counts up to each bucket boundary.
- The bucket customization note said an EnvoyFilter was required. Updated it to use Istio's documented `sidecar.istio.io/statsHistogramBuckets` pod annotation.

## Review Notes
- The PromQL examples correctly keep the `le` label when using `histogram_quantile()` with classic Prometheus histograms.
- The PrometheusRule example uses the current `monitoring.coreos.com/v1` API shape. Whether Prometheus selects the rule depends on the cluster's Prometheus Operator rule selectors and labels.
- Istio marks `sidecar.istio.io/statsHistogramBuckets` as an Alpha annotation, so teams should test it against their Istio version before relying on it broadly.
