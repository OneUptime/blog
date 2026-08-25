# How to Export VPA Target, Lower, Upper, and Uncapped Recommendations to Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Prometheus, kube-state-metrics, Monitoring

Description: Export every VPA recommendation bound from custom-resource status with kube-state-metrics, correct units and labels, and Prometheus queries that expose clipping and update headroom.

---

VPA stores per-container `target`, `lowerBound`, `upperBound`, and `uncappedTarget` in the `VerticalPodAutoscaler` custom resource. The recommender's own `/metrics` endpoint exposes component health and counts, not one time series for every recommendation value. Export the custom-resource status with kube-state-metrics Custom Resource State Metrics.

## Use Custom Resource State Metrics

kube-state-metrics removed VerticalPodAutoscaler from its default resources in v2.9.0. Configure the `autoscaling.k8s.io/v1` CRD explicitly. This compact configuration exports CPU and memory for all four fields:

```yaml
kind: CustomResourceStateMetrics
spec:
  resources:
    - groupVersionKind:
        group: autoscaling.k8s.io
        version: v1
        kind: VerticalPodAutoscaler
      metricNamePrefix: kube
      labelsFromPath:
        namespace: [metadata, namespace]
        verticalpodautoscaler: [metadata, name]
        target_api_version: [spec, targetRef, apiVersion]
        target_kind: [spec, targetRef, kind]
        target_name: [spec, targetRef, name]
      metrics:
        - name: verticalpodautoscaler_status_recommendation_containerrecommendations_target_cpu
          help: Target CPU request recommended for the container.
          commonLabels: {resource: cpu, unit: core}
          each:
            type: Gauge
            gauge:
              path: [status, recommendation, containerRecommendations]
              labelsFromPath: {container: [containerName]}
              valueFrom: [target, cpu]
        - name: verticalpodautoscaler_status_recommendation_containerrecommendations_target_memory
          help: Target memory request recommended for the container.
          commonLabels: {resource: memory, unit: byte}
          each:
            type: Gauge
            gauge:
              path: [status, recommendation, containerRecommendations]
              labelsFromPath: {container: [containerName]}
              valueFrom: [target, memory]
        - name: verticalpodautoscaler_status_recommendation_containerrecommendations_lowerbound_cpu
          help: Lower CPU recommendation bound for the container.
          commonLabels: {resource: cpu, unit: core}
          each:
            type: Gauge
            gauge:
              path: [status, recommendation, containerRecommendations]
              labelsFromPath: {container: [containerName]}
              valueFrom: [lowerBound, cpu]
        - name: verticalpodautoscaler_status_recommendation_containerrecommendations_lowerbound_memory
          help: Lower memory recommendation bound for the container.
          commonLabels: {resource: memory, unit: byte}
          each:
            type: Gauge
            gauge:
              path: [status, recommendation, containerRecommendations]
              labelsFromPath: {container: [containerName]}
              valueFrom: [lowerBound, memory]
        - name: verticalpodautoscaler_status_recommendation_containerrecommendations_upperbound_cpu
          help: Upper CPU recommendation bound for the container.
          commonLabels: {resource: cpu, unit: core}
          each:
            type: Gauge
            gauge:
              path: [status, recommendation, containerRecommendations]
              labelsFromPath: {container: [containerName]}
              valueFrom: [upperBound, cpu]
        - name: verticalpodautoscaler_status_recommendation_containerrecommendations_upperbound_memory
          help: Upper memory recommendation bound for the container.
          commonLabels: {resource: memory, unit: byte}
          each:
            type: Gauge
            gauge:
              path: [status, recommendation, containerRecommendations]
              labelsFromPath: {container: [containerName]}
              valueFrom: [upperBound, memory]
        - name: verticalpodautoscaler_status_recommendation_containerrecommendations_uncappedtarget_cpu
          help: Usage-based CPU target before VPA resource-policy bounds.
          commonLabels: {resource: cpu, unit: core}
          each:
            type: Gauge
            gauge:
              path: [status, recommendation, containerRecommendations]
              labelsFromPath: {container: [containerName]}
              valueFrom: [uncappedTarget, cpu]
        - name: verticalpodautoscaler_status_recommendation_containerrecommendations_uncappedtarget_memory
          help: Usage-based memory target before VPA resource-policy bounds.
          commonLabels: {resource: memory, unit: byte}
          each:
            type: Gauge
            gauge:
              path: [status, recommendation, containerRecommendations]
              labelsFromPath: {container: [containerName]}
              valueFrom: [uncappedTarget, memory]
```

The official kube-state-metrics example provides a complete VPA configuration with these paths. CPU quantities are exposed in cores, so `250m` becomes `0.25`; memory quantities are exposed in bytes.

## Mount the Configuration and Grant Read Access

Pass the file to kube-state-metrics using its supported flag:

```yaml
args:
  - --custom-resource-state-config-file=/etc/customresourcestate/config.yaml
```

Mount the configuration from a ConfigMap or your deployment mechanism. The kube-state-metrics service account must be able to list and watch VPA objects:

```yaml
- apiGroups: [autoscaling.k8s.io]
  resources: [verticalpodautoscalers]
  verbs: [list, watch]
```

Modify the existing kube-state-metrics ClusterRole through its chart or manifests rather than creating overlapping ownership. Restart kube-state-metrics after changing the file, and check logs for discovery, RBAC, path, or quantity-conversion errors.

```bash
kubectl auth can-i --as=system:serviceaccount:monitoring:kube-state-metrics \
  list verticalpodautoscalers.autoscaling.k8s.io --all-namespaces
kubectl -n monitoring logs deploy/kube-state-metrics --since=15m
kubectl -n monitoring port-forward deploy/kube-state-metrics 8080:8080
curl -s localhost:8080/metrics | grep kube_verticalpodautoscaler_status_recommendation
```

## Query and Alert on Meaning, Not Just Presence

The resulting names include:

```promql
kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target_cpu
kube_verticalpodautoscaler_status_recommendation_containerrecommendations_lowerbound_memory
kube_verticalpodautoscaler_status_recommendation_containerrecommendations_upperbound_memory
kube_verticalpodautoscaler_status_recommendation_containerrecommendations_uncappedtarget_memory
```

Find recommendations clipped by a memory policy:

```promql
kube_verticalpodautoscaler_status_recommendation_containerrecommendations_uncappedtarget_memory
  >
kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target_memory
```

Convert memory to GiB for a dashboard:

```promql
kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target_memory
  / 1024 / 1024 / 1024
```

Compare target with current requests by joining the VPA series to kube-state-metrics Pod/container request metrics using namespace, target, and container labels. Do not join only on `container`; common names such as `app` and `sidecar` collide across workloads.

## Handle Optional and Missing Status Correctly

All recommendation fields are API status, and several are optional. A VPA with no recommendation produces no value series for these paths. A container with `mode: Off` is intentionally absent. `uncappedTarget` can be absent on versions or states that do not populate it.

Use a per-object status or condition export to distinguish “zero” from “not present.” `vpa_recommender_vpa_objects_count` can corroborate aggregate state by label, but it does not identify the affected VPA or container. Never coerce a missing recommendation to zero resource demand.

Keep labels bounded. Namespace, VPA, target, container, resource, and unit are useful; copying arbitrary annotations or all workload labels can create unnecessary cardinality.

## Do Not Confuse Export with History Input

`--storage=prometheus` on the VPA recommender means Prometheus is an input history provider at recommender startup. It does not export VPA status. Conversely, kube-state-metrics reads VPA objects and exports their status; it does not supply usage history to the recommender. The two Prometheus integrations solve opposite data flows.

## Official Documentation

- [kube-state-metrics Custom Resource State Metrics](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md)
- [Complete kube-state-metrics VPA metric configuration](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md#all-verticalpodautoscaler-metrics)
- [VPA API recommendation field semantics](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#recommendedcontainerresources)
- [VPA recommender component metrics source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/metrics/recommender/recommender.go)
- [Kubernetes custom resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)

## Conclusion

Export VPA recommendations from the custom resource with kube-state-metrics, not from the recommender's component endpoint. Preserve CPU and memory units, label by target and container, represent missing status as missing, and use `uncappedTarget` versus `target` to reveal persistent policy clipping.
