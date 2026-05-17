# Validation Summary: How to Configure Pod Disruption Budgets on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Disruption Budgets (`policy/v1`)
- Talos Linux (node upgrades via `talosctl`)
- Kubernetes Deployments and StatefulSets
- Topology Spread Constraints and Pod Anti-Affinity
- Cluster Autoscaler interaction with PDBs
- PostgreSQL and etcd as example stateful workloads
- kube-state-metrics PDB metrics
- Prometheus Operator (`PrometheusRule`)
- kubectl (events, custom-columns output)

## Sources Consulted
- Kubernetes — Specifying a Disruption Budget for your Application: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes — Disruptions concept: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes — Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- kube-state-metrics — PodDisruptionBudget metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/poddisruptionbudget-metrics.md
- Talos Linux — Upgrading Talos: https://www.talos.dev/v1.12/talos-guides/upgrading-talos/
- Prometheus Operator — PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
No technical issues found. All claims verified:
- `policy/v1` is the correct, GA API version for PDBs (since Kubernetes 1.21).
- `minAvailable` XOR `maxUnavailable` constraint is correctly stated.
- `unhealthyPodEvictionPolicy` with `AlwaysAllow` / `IfHealthyBudget` (default) values is accurate (GA in Kubernetes 1.27).
- Voluntary vs. involuntary disruption categorization matches the official Kubernetes docs (OOM kills correctly classified as involuntary).
- kube-state-metrics metric names (`kube_poddisruptionbudget_status_pod_disruptions_allowed`, `_desired_healthy`, `_expected_pods`, `_current_healthy`) are all valid and stable.
- `talosctl upgrade --nodes <ip>` syntax is correct.
- `kubectl get events --field-selector reason=Evicted` uses a valid event reason.
- Deployment, StatefulSet, PrometheusRule, and topologySpreadConstraints YAML structures all use correct API versions and field names.

## Review Notes
- The post does not pin a Kubernetes version for `unhealthyPodEvictionPolicy`. Readers on clusters older than 1.27 (where it went GA; beta in 1.26) would need the feature gate. This is a minor caveat but acceptable as written for a 2026-dated post where 1.27+ is the norm.
- The `talosctl upgrade --nodes <ip>` example is a minimal form; in practice users typically also pass `--image` to specify the target Talos installer image. The post's framing as a conceptual flow rather than a copy-paste command makes this acceptable.
- The `PDBMisconfigured` PromQL rule (`desired_healthy > expected_pods`) is reasonable but will only catch obviously misconfigured `minAvailable` cases; it won't flag `maxUnavailable` mismatches since `desired_healthy` is computed as `expected_pods - maxUnavailable`. Not incorrect, just narrow in coverage.
