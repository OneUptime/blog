# Validation Summary: How to Prevent Calico Node Not Ready Status

## Status
validated

## Post Type
Guide / Troubleshooting Prevention

## Technologies Covered
- Calico (calico-node DaemonSet)
- Kubernetes (DaemonSet, PriorityClass, eviction, node Ready condition)
- kubectl (patch, JSON Patch RFC 6902)
- Prometheus / kube-state-metrics
- Prometheus Operator (PrometheusRule CRD)

## Sources Consulted
- kube-state-metrics pod metrics docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Tigera Calico calico-node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Upstream Calico DaemonSet manifests (k0s, kubernetes/cloud-provider-gcp) — confirm `priorityClassName: system-node-critical` is set by default
- JSON Patch RFC 6902: https://datatracker.ietf.org/doc/html/rfc6902

## Issues Found
1. **Incorrect Prometheus metric for container readiness alert.** The original alert expression was:
   ```
   kube_pod_status_ready{namespace="kube-system",container="calico-node"} == 0
   ```
   The `kube_pod_status_ready` metric is a pod-level metric and does NOT have a `container` label (its labels are `pod`, `namespace`, `condition`, `uid`). With a non-existent label matcher, the query would return no series and the alert would never fire. Changed to `kube_pod_container_status_ready`, which is the container-level equivalent and does carry a `container` label, matching the post's intent of alerting on calico-node container readiness.

## Review Notes
- The `kubectl patch ... --type=json` JSON Patch syntax for both resources and `priorityClassName` paths is correct for a DaemonSet (PodSpec lives at `spec.template.spec`).
- `system-node-critical` is a valid built-in Kubernetes PriorityClass, and the upstream Calico manifests already set it on the calico-node DaemonSet by default. The "Prevention 2" patch is therefore typically a no-op on a fresh install but remains useful as a defensive measure for customized manifests that may have removed it.
- The resource request/limit values (250m/256Mi requests, 1000m/512Mi limits) are reasonable starting points for calico-node and align with common community guidance; actual values should be tuned per cluster.
- Prevention 3 intentionally cross-references another post for the DaemonSet YAML rather than duplicating it — left as-is.
