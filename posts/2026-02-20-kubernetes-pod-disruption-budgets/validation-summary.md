# Validation Summary: How to Use Kubernetes Pod Disruption Budgets for Safe Maintenance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- PodDisruptionBudget
- Kubernetes Eviction API
- kubectl drain
- Deployments
- StatefulSets
- topologySpreadConstraints
- readiness probes

## Sources Consulted
- Kubernetes documentation: Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes API reference: PodDisruptionBudget policy/v1 - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes kubectl reference: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The post originally implied that PDBs protect against all voluntary disruptions, including direct pod deletion and Deployment rolling updates. Kubernetes documents that direct pod/deployment deletion bypasses PDBs, and workload controllers such as Deployments and StatefulSets are not limited by PDBs during rolling updates, even though unavailable pods count against the disruption budget. Updated the wording to say PDBs protect voluntary evictions through the Eviction API and noted that rolling updates and direct pod deletions are not blocked by PDBs.
- Some comments said pods must remain "running at all times." PDB health is based on availability/healthy status and only constrains voluntary evictions, not every cause of unavailability. Updated those comments to say "available during voluntary evictions."
- The best-practice recommendation for `maxUnavailable: 1` was too broad for single-replica workloads, where it can allow 100% unavailability. Updated it to "most replicated applications."

## Review Notes
The YAML examples use the current `policy/v1` PodDisruptionBudget API and valid `apps/v1` Deployment fields. The `kubectl drain` flags `--timeout`, `--ignore-daemonsets`, and `--delete-emptydir-data` are current. `kubectl` was not installed locally, so CLI flag verification was performed against the official generated Kubernetes kubectl reference.
