# Validation Summary: How to Handle Kubernetes Pod Disruption Budgets

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Kubernetes Pod Disruption Budgets (`policy/v1` PodDisruptionBudget)
- kubectl (get, describe, drain, scale, patch, annotate, cordon, uncordon, wait, top, logs, events)
- jq for JSON parsing of kubectl output
- kube-state-metrics PDB metrics
- Prometheus alerting rules (`monitoring.coreos.com/v1` PrometheusRule)
- PromQL
- Cluster Autoscaler annotations (`cluster-autoscaler.kubernetes.io/scale-down-disabled`, `cluster-autoscaler.kubernetes.io/safe-to-evict`)
- Bash scripting
- Mermaid diagrams

## Sources Consulted
- Kubernetes PDB documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes "Disruptions" concept page: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- kubectl drain reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain (specifically `--force`, `--disable-eviction`, `--ignore-daemonsets`, `--delete-emptydir-data`, `--grace-period`, `--dry-run`)
- kubectl scale reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#scale (confirms `--replicas` requires an absolute integer)
- Kubernetes API reference for PodDisruptionBudgetStatus fields (`currentHealthy`, `desiredHealthy`, `disruptionsAllowed`, `expectedPods`, `conditions[].type=DisruptionAllowed`, `Reason=InsufficientPods`/`SufficientPods`/`SyncFailed`)
- kube-state-metrics documentation for PDB metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/poddisruptionbudget-metrics.md (confirms `kube_poddisruptionbudget_status_pod_disruptions_allowed`, `kube_poddisruptionbudget_status_current_healthy`, `kube_poddisruptionbudget_status_desired_healthy`, `kube_poddisruptionbudget_status_expected_pods`)
- Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md (confirms `scale-down-disabled` and `safe-to-evict` annotation names)
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
1. **`kubectl drain --force` was described as bypassing PDB protection.** This is incorrect. The `--force` flag only allows draining of pods that are not managed by a controller (orphan pods); it does NOT bypass PodDisruptionBudgets. The flag that bypasses PDBs is `--disable-eviction`, which makes drain use the Delete API (rather than the Eviction API), and Delete does not consult PDBs. Fixed by adding `--disable-eviction` to the Strategy 3 example and clarifying the comments to describe what each flag actually does. Also updated the Mermaid flowchart node from `kubectl drain --force` to `kubectl drain --disable-eviction` so the diagram matches the corrected behavior.

2. **`kubectl scale deployment affected-app --replicas=+1` is invalid syntax.** `kubectl scale --replicas` requires an absolute integer value; relative increments like `+1` are not supported and the command will reject the input. Fixed by first reading the current replica count via `kubectl get deployment ... -o jsonpath='{.spec.replicas}'` and then passing an absolute value (`$((current+1))`) to `--replicas`.

## Review Notes
- The Strategy 1 example uses both `-o wide` and `-o jsonpath='...'` flags on the same `kubectl get pods` command. The second `-o` overrides the first, so `-o wide` is effectively a no-op. The command still works correctly, so this was left as-is (not a technical error, just redundant).
- The events command `kubectl get events -A --field-selector reason=EvictionFailed` is plausible; eviction-related events do appear, although names vary by Kubernetes version and the source component emitting them. Left unchanged since the underlying technique (filtering events by reason) is correct.
- PDB condition reasons (`InsufficientPods`, `SufficientPods`, `SyncFailed`) and the `DisruptionAllowed` condition type are all current and accurate per the Kubernetes API reference.
- All kube-state-metrics names used (`kube_poddisruptionbudget_status_pod_disruptions_allowed`, `kube_poddisruptionbudget_status_current_healthy`, `kube_poddisruptionbudget_status_desired_healthy`) are valid in current kube-state-metrics releases.
- All PDB status fields used in jsonpath expressions (`disruptionsAllowed`, `currentHealthy`, `desiredHealthy`, `expectedPods`) match the actual `PodDisruptionBudgetStatus` schema.
- The `apiVersion: policy/v1` for PodDisruptionBudget is correct (it has been the stable version since Kubernetes 1.21; `policy/v1beta1` was removed in 1.25).
- The cluster-autoscaler annotations are valid and remain in use.
- The article is operationally focused and does not pin any specific Kubernetes version, which is appropriate given the API surface used has been stable for several releases.
