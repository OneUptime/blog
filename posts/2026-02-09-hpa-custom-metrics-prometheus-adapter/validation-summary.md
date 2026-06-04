# Validation Summary: How to Configure HPA with Custom Metrics from Prometheus Adapter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes custom metrics API
- Prometheus Adapter
- Prometheus and PromQL
- Helm
- Python prometheus_client

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter Helm chart README: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-adapter/README.md
- Prometheus Adapter Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-adapter/values.yaml
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Python prometheus_client Histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- Python prometheus_client HTTP exporter documentation: https://prometheus.github.io/client_python/exporting/http/

## Issues Found
- The `http_requests_total` adapter rule used `rate()` without aggregating by the Kubernetes resource labels. This can return multiple Prometheus series for one pod when the counter has labels such as `method` and `endpoint`. Changed it to `sum(rate(...)) by (<<.GroupBy>>)`.
- The latency adapter rule discovered `http_request_duration_seconds`, but Python prometheus_client histograms expose classic histogram series as `http_request_duration_seconds_bucket`, `http_request_duration_seconds_sum`, and `http_request_duration_seconds_count`. Changed discovery to the `_bucket` series.
- The latency `histogram_quantile()` query appended `_bucket` to `<<.Series>>` and did not aggregate by `le`, which is required for classic histogram quantile queries. Changed it to aggregate `sum(rate(...)) by (<<.GroupBy>>, le)` before calling `histogram_quantile()`.
- The optimization examples repeated the same unaggregated request-rate and histogram queries. Updated those examples to match the corrected adapter rules.
- The best-practice guidance said PromQL query windows should match HPA stabilization windows. These serve different purposes: PromQL range windows smooth metric calculations, while HPA stabilization windows smooth replica recommendations. Reworded that guidance.

## Review Notes
- The HPA `autoscaling/v2` examples, `Pods` metric source usage, `AverageValue` targets, scaling behavior fields, and multiple-metric behavior align with Kubernetes documentation.
- The Helm install command uses the documented Prometheus Adapter chart repository and `prometheus.url` / `prometheus.port` values. The exact Prometheus service name still depends on how Prometheus is installed in the target cluster.
- The annotation-based Prometheus scrape example is valid for Prometheus setups that support those annotations; Prometheus Operator users commonly use `ServiceMonitor` or `PodMonitor` resources instead.
