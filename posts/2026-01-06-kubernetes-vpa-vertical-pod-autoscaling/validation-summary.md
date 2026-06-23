# Validation Summary: How to Implement Vertical Pod Autoscaling (VPA) in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Vertical Pod Autoscaler (VPA) — `autoscaling.k8s.io/v1`
- Kubernetes Horizontal Pod Autoscaler (HPA) — `autoscaling/v2`
- Helm (cowboysysop VPA chart)
- PodDisruptionBudget (`policy/v1`)
- Prometheus / kube-state-metrics / Prometheus Operator (`PrometheusRule`)
- kubectl

## Sources Consulted
- Kubernetes VPA source (autoscaler repo): updater metrics — https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/pkg/utils/metrics/updater/updater.go
- Kubernetes VPA source: recommender metrics — https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/pkg/utils/metrics/recommender/recommender.go
- Kubernetes VPA source: metrics namespace constant (`TopMetricsNamespace = "vpa_"`) — https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/pkg/utils/metrics/metrics.go
- Kubernetes docs: Vertical Pod Autoscaling — https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- kube-state-metrics VPA metric (`kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target`) — https://github.com/kubernetes/kube-state-metrics
- `EvictedByVPA` event reason confirmed via kubernetes/autoscaler issue discussions and KodeKloud/Konnect VPA references

## Issues Found
1. **Incorrect Prometheus metric name `vpa_updater_eviction_total`.** The actual updater metric is `vpa_updater_evicted_pods_total` (namespace `vpa_updater`, name `evicted_pods_total`). Fixed in both the "Key VPA metrics" list and the dashboard `rate(...)` query.
2. **Incorrect Prometheus metric name `vpa_recommender_aggregate_container_states`.** The actual recommender metric is `vpa_recommender_aggregate_container_states_count` (it carries the `_count` suffix). Fixed in the "Key VPA metrics" list.
3. **Non-existent metric `vpa_recommender_recommendation_cpu_target`.** The VPA recommender does not export per-target recommendation values as a Prometheus metric. The correct source for VPA recommendation targets is kube-state-metrics: `kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="cpu"}`. Fixed in both the `PrometheusRule` alert expression and the dashboard query. The join in the alert expression was also updated from `on(namespace, vpa, container)` to `on(namespace, container)` because the kube-state-metrics series uses the label `verticalpodautoscaler` (not `vpa`); `namespace`/`container` are the labels meaningfully shared with `kube_pod_container_resource_requests`.

The metric `vpa_recommender_recommendation_latency_seconds` was verified as correct and left unchanged.

## Review Notes
- The `kube_verticalpodautoscaler_*` metrics used after the fix require kube-state-metrics to be deployed with VPA custom-resource support enabled. The post does not state this prerequisite explicitly; readers should ensure kube-state-metrics is configured to expose VPA metrics.
- The verify command `kubectl get pods -n kube-system -l app.kubernetes.io/name=vpa` is label/chart-dependent. Pods installed via the official `hack/vpa-up.sh` script use labels like `app: vpa-recommender` (matching the troubleshooting commands later in the post), and the cowboysysop Helm chart typically labels pods with `app.kubernetes.io/name: vertical-pod-autoscaler`. The exact selector may need adjusting to the install method; the simpler `kubectl get pods -n kube-system | grep vpa` shown earlier is reliable. Left unchanged as it is version/chart-dependent and not strictly incorrect.
- VPA `targetRef` pointing directly at a `CronJob` (batch/v1) is a known gray area — VPA works most reliably against controllers exposing a scale subresource (Deployments, StatefulSets, etc.). The example is illustrative and commonly shown in community guides; left as-is.
- Update modes shown (Off, Initial, Auto) are correct; VPA also supports a `Recreate` mode and the newer in-place update modes, which are out of scope for this post.
