# Validation Summary: How to Monitor Service-Level Metrics in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Prometheus and PromQL
- Grafana dashboards
- Kubernetes resource metrics
- Prometheus Operator PrometheusRule resources
- Google SRE golden signals

## Sources Consulted
- Google SRE Book, "Monitoring Distributed Systems": https://sre.google/sre-book/monitoring-distributed-systems/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Prometheus `histogram_quantile()` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus histogram practices documentation: https://prometheus.io/docs/practices/histograms/
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy access log and response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The introduction claimed Istio automatically generates all four golden signals through Envoy sidecars. Istio standard request metrics directly cover latency, traffic, and errors, while saturation needs Kubernetes and Envoy resource-related metrics, so the wording was corrected.
- The traffic section labeled a query as "Request Rate by HTTP Method" while grouping by Istio's `request_protocol` label. The heading and dashboard label were changed to "Request Protocol".
- The gRPC error-rate query used `grpc_response_status!="0"` without constraining the traffic to gRPC. The query now filters both numerator and denominator with `request_protocol="grpc"`.
- The response-flags query used `response_flags!~"-|0"`. Envoy uses `-` for no response flag, so the query was simplified to `response_flags!="-"`.
- The connection-pool example implied the query measured active connections versus a limit. Envoy exposes active connections; the configured `maxConnections` limit must be compared separately, so the surrounding text and query comment were corrected.
- The CPU saturation explanation described CPU requests as a limit. Kubernetes CPU requests are reservations, not hard runtime limits, so the note now says the ratio compares usage against requested CPU and recommends monitoring limits and throttling when CPU limits are configured.
- The `TrafficDrop` alert grouped only by `destination_workload`, which can mix workloads with the same name across namespaces. It now groups by both `destination_workload` and `destination_workload_namespace`.

## Review Notes
The PromQL histogram patterns, Istio standard metric names, main Istio labels, Envoy response flag examples, Kubernetes resource metric usage, and `PrometheusRule` YAML structure are technically valid. Envoy proxy-level metrics such as `envoy_cluster_upstream_cx_active` and `envoy_cluster_upstream_rq_pending_active` may require Istio proxy stats inclusion settings depending on mesh configuration, so readers may need to confirm those stats are being scraped in their deployment.
