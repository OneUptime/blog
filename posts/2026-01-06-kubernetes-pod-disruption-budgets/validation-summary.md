# Validation Summary: How to Implement Pod Disruption Budgets for Zero-Downtime Updates

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Kubernetes Pod Disruption Budgets (`policy/v1`)
- Kubernetes Deployments and StatefulSets
- `kubectl` (drain, scale, run, describe, get)
- Cluster Autoscaler
- Horizontal Pod Autoscaler (`autoscaling/v2`)
- Prometheus / kube-state-metrics / Prometheus Operator (`PrometheusRule`)

## Sources Consulted
- Kubernetes — Disruptions concept doc: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes — Specifying a Disruption Budget: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes — PodDisruptionBudget API reference (policy/v1): https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/
- kubectl drain reference (`--dry-run=client|server|none`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- kube-state-metrics PDB metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/poddisruptionbudget-metrics.md

## Issues Found

1. **Incorrect claim that PDBs protect Deployment rolling updates (Voluntary Disruptions list).** The post listed "Deployment rolling updates" among the disruptions PDBs protect against. Per the official docs, workload controllers (Deployment/StatefulSet) delete pods directly during a rolling upgrade and are **not** limited by PDBs ("deleting deployments or pods bypasses Pod Disruption Budgets"). Removed that bullet and clarified the list covers Eviction-API-based disruptions.

2. **Incorrect "Deployment Rolling Update" section.** The post stated "Rolling updates also respect PDBs" and "The Deployment's maxUnavailable and the PDB's maxUnavailable both apply. The more restrictive wins." This is wrong — rolling updates are bounded only by the workload's own `maxUnavailable`/`maxSurge`, not by the PDB. Rewrote the prose to state that rolling updates are not governed by PDBs and that availability during a rollout is controlled by the Deployment's `maxUnavailable`/`maxSurge`. Kept the YAML example intact.

3. **Deprecated bare `--dry-run` flag.** `kubectl drain <node> --ignore-daemonsets --dry-run` used the boolean form deprecated since Kubernetes 1.18. Updated to `--dry-run=client`.

## Review Notes
- The PDB API version `policy/v1` is correct (GA since Kubernetes 1.21); `policy/v1beta1` was removed in 1.25.
- HPA `autoscaling/v2` is correct (GA since 1.23).
- kube-state-metrics metric names used in the Prometheus alerts (`kube_poddisruptionbudget_status_pod_disruptions_allowed`, `kube_poddisruptionbudget_status_current_healthy`, `kube_poddisruptionbudget_status_desired_healthy`) are accurate.
- `kubectl describe pdb` output fields (Allowed disruptions, Current, Desired, Expected, Min available) and the `-l/--labels` flag on `kubectl run` are correct.
- minAvailable/maxUnavailable semantics, percentage handling, and the quorum/anti-affinity guidance are all accurate. No further changes needed.
