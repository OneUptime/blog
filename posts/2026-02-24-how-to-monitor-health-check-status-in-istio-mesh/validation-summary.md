# Validation Summary: How to Monitor Health Check Status in Istio Mesh

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Envoy proxy metrics and admin API
- Kubernetes probes, Events, and EndpointSlices
- kube-state-metrics
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Helm
- Grafana dashboards
- Alertmanager webhooks

## Sources Consulted
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio health checking of services documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio istioctl command reference for `proxy-config endpoint`: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy cluster outlier detection statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin `/clusters` documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy health status enum: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics deployment metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- Kubernetes Event API deprecation guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The kube-state-metrics readiness examples used `count()` on condition series that can exist with value `0`, which would overcount not-ready pods. Updated readiness queries and alerts to filter ready/not-ready condition series with `== 1`.
- The "percentage of ready pods per deployment" query grouped by pod and did not calculate a deployment-level percentage. Updated the label and query to calculate percentage of ready pods for the namespace without claiming deployment grouping.
- The Envoy outlier detection examples used deprecated `ejections_total` and `ejections_consecutive_5xx` counters as primary examples. Updated the text, PromQL, and alert to use current enforced/detected ejection counters.
- The Envoy admin API command omitted the leading slash on `/clusters?format=json`. Updated the command to match the documented admin path.
- The sidecar metrics command used `/metrics` on port 15020. Updated it to Istio's documented `/stats/prometheus` path and corrected the surrounding description to merged Prometheus metrics.
- The Kubernetes event command sorted by deprecated `.lastTimestamp`. Updated it to use the current `kubectl events` command for recent events.
- The service endpoint checks used the deprecated Endpoints API. Updated examples to query EndpointSlices by the `kubernetes.io/service-name` label.
- The all-endpoints-ejected alert could match empty clusters if both compared values were zero. Added a membership guard before comparing active ejections to total membership.
- The Helm install example assumed the Prometheus Community chart repository was already configured. Added the chart repository setup commands before `helm install`.

## Review Notes
The PrometheusRule API shape is current, but whether a rule is loaded depends on the Prometheus Operator instance's namespace and label selectors. The Envoy metric names shown are the common Prometheus-exported forms of Envoy stats; exact availability depends on Istio/Envoy stats inclusion settings and whether outlier detection is configured for the clusters being queried.
