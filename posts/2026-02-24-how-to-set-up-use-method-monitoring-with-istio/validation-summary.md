# Validation Summary: How to Set Up USE Method Monitoring with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy proxy metrics
- Prometheus and PromQL
- Kubernetes container and kube-state-metrics metrics
- Prometheus Operator PrometheusRule alerts
- Grafana dashboard organization

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy Statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl and metrics reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio MeshConfig proxyStatsMatcher reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy upstream cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy listener statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy server statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/

## Issues Found
- The post used Envoy-native metrics without mentioning that Istio's default proxy stats collection is minimal. Added a sentence explaining that these metrics must be enabled with `proxyStatsMatcher` when the mesh uses the default minimal Envoy stats collection.
- The connection pool saturation query contained an extra space before the range selector. Removed it for clearer PromQL syntax.
- The circuit breaker section described `envoy_cluster_upstream_rq_retry_overflow` as requests rejected by the circuit breaker. Envoy documents this as retries not performed because of circuit breaking or retry budget limits, so the comment was changed to "Retries rejected by circuit breaker or retry budget."
- The istiod section used `pilot_xds_push_queue_time_bucket`, which is not a current documented Istio metric. Replaced it with a `histogram_quantile` query over `pilot_proxy_queue_time_bucket`, matching the documented `pilot_proxy_queue_time` distribution.
- The istiod section used `pilot_xds_push_errors`, which is not a current documented Istio metric. Replaced it with `pilot_total_xds_internal_errors`.
- The istiod section used `pilot_xds_pushes{}` for connected proxies. Current Istio documentation lists `pilot_xds` as the number of XDS endpoints connected to a pilot, so this was corrected.

## Review Notes
The PromQL examples are valid for common Prometheus scrapes of Kubernetes, kube-state-metrics, Istio, and Envoy metrics, but exact Envoy metric availability and labels can vary with Istio proxy stats configuration and Envoy stat naming. The post now calls out the proxy stats configuration requirement.
