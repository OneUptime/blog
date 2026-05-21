# Validation Summary: How to Handle High-Cardinality Istio Metrics in Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus metric relabeling
- Kubernetes YAML

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Upgrade Problems, histogram bucket migration guidance: https://istio.io/latest/docs/ops/common-problems/upgrade-issues/
- Prometheus configuration reference, relabeling and metric relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API, TSDB status endpoint: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions, `rate`, `label_replace`, and `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus aggregation operators: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The introductory label examples mentioned pod names as if they were standard Istio request metric labels. Current Istio standard metrics expose workload, namespace, app, version, service, principal, reporter, and canonical-service labels instead. I updated the wording and expanded the example label list to match current documented labels more closely.
- The post said every dropped label can reduce cardinality by an order of magnitude. That depends on the number of unique values in that label, so I softened the claim to say labels can reduce cardinality substantially when they have many unique values.
- The response-code aggregation example used `metric_relabel_configs` to rewrite `200`, `201`, and similar values to `2xx`. Prometheus metric relabeling does not aggregate samples, so this can create duplicate label sets for the same metric. I replaced it with a recording rule that uses `label_replace` and `sum by` to aggregate response-code classes safely.
- The histogram bucket example used `ISTIO_METAJSON_STATS_HISTOGRAM_BUCKETS` in `IstioOperator` proxy metadata. Current Istio documentation points users to the `sidecar.istio.io/statsHistogramBuckets` pod annotation for histogram bucket customization. I replaced the snippet with a Deployment pod-template annotation and updated the default bucket count from "20+" to the documented 19 buckets.
- The quick-wins list claimed dropping principal labels saves exactly 2x cardinality. That is not guaranteed, so I changed it to recommend dropping those labels only when they are unused.

## Review Notes
`promtool` was not installed in the local environment, so I could not run Prometheus rule syntax validation locally. The corrected PromQL and configuration patterns were checked against current official Prometheus and Istio documentation.
