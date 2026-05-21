# Validation Summary: How to Estimate Prometheus Storage for Istio Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service metrics and Telemetry API
- Prometheus TSDB, PromQL, recording rules, metric relabeling, and remote write
- Thanos Receive
- Kubernetes PersistentVolumeClaims

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio resource annotations, including `sidecar.istio.io/statsHistogramBuckets`: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy statistics and `ProxyStatsMatcher`: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus HTTP API TSDB status endpoint: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus configuration reference for `metric_relabel_configs`, `remote_write`, and `write_relabel_configs`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus `histogram_quantile()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Thanos Receive documentation: https://thanos.io/tip/components/receive.md/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The post described Istio's default histogram bucket count as 20 buckets plus `_sum` and `_count`. Istio documents 19 finite default bucket boundaries; in Prometheus this results in 20 bucket series including `+Inf`, plus `_sum` and `_count`. Updated the wording while preserving the 22-series calculation.
- The storage formula multiplied by retention twice because `Samples_Per_Series` already includes retention. Removed the extra `Retention_Period` factor from the formula.
- The post attributed Prometheus compression specifically to Gorilla encoding. Prometheus officially documents the 1-2 bytes per sample estimate but does not require that implementation detail in the user-facing storage formula, so the wording now simply says compression.
- The "Top label cardinality contributors" PromQL query actually returns top Istio metrics by series count. Updated the comment to match the query.
- The histogram bucket customization example used `proxyStatsMatcher`, which controls optional Envoy stat creation and does not customize Istio histogram buckets. Replaced it with the documented `sidecar.istio.io/statsHistogramBuckets` workload annotation.
- The Telemetry resource used the wrong API group, `networking.istio.io/v1`. Updated it to the documented `telemetry.istio.io/v1`.
- The recording rules section implied metric relabeling can drop raw metrics after a short retention in the same Prometheus. Prometheus applies metric relabeling before ingestion, so the text now warns to do this only after moving aggregation elsewhere or removing rules that need the raw buckets.
- The storage alert used `prometheus_tsdb_retention_limit_bytes` without noting that it is meaningful for size-based retention. Updated the text and expression to include WAL storage and guard against a zero retention-size limit.

## Review Notes
The storage estimates remain approximate, which is appropriate for capacity planning. Actual disk use can vary with label churn, scrape success, WAL behavior, retention settings, and block compaction.
