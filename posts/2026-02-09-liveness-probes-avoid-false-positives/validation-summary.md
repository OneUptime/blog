# Validation Summary: Configure Kubernetes Liveness Probes That Avoid False Positive Pod Restarts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes liveness, readiness, and startup probes
- Kubernetes PodDisruptionBudgets
- kubectl
- Go HTTP health check handlers
- Prometheus PromQL
- kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes API reference: PodDisruptionBudget policy/v1 - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl quick reference - https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Prometheus documentation: Operators and vector matching - https://prometheus.io/docs/prometheus/latest/querying/operators/
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The Deployment YAML examples omitted required `spec.selector` and matching `spec.template.metadata.labels` fields for `apps/v1` Deployments. Added selectors and matching pod template labels to both Deployment snippets so the manifests are structurally valid.
- The PodDisruptionBudget section claimed PDBs prevent Kubernetes from restarting too many pods simultaneously during liveness probe failures. PDBs limit voluntary disruptions such as evictions, but they do not prevent kubelet restarts caused by failed liveness probes. Updated the wording to describe the correct PDB behavior.
- The monitoring section described `kube_pod_container_status_restarts_total` as liveness-triggered restart data. That metric reports container restarts, not the liveness probe cause by itself. Updated the text to recommend correlating restart metrics with probe failure events.
- The PromQL crash-loop alert combined container-level restart metrics with pod-level start time using `and` without explicit label matching. Added `and on(namespace, pod)` so the vectors match correctly despite different label sets.
- The restart-count command only reported the first container in each pod. Updated the `jq` pipeline to iterate over all `containerStatuses` and include the container name.
- The event-sorting command used `.lastTimestamp`; updated it to `.metadata.creationTimestamp`, which matches the official kubectl quick reference for sorting events by timestamp.

## Review Notes
The Go examples are illustrative snippets that depend on application-specific helpers such as `app.IsDeadlocked()`, `memoryUsage()`, and `deadlockDetected()`. The Kubernetes probe field names, defaults, and semantics are consistent with current Kubernetes documentation.
