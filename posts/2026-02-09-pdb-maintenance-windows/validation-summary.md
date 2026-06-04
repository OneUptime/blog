# Validation Summary: How to Configure Kubernetes Pod Disruption Budgets That Account

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes PodDisruptionBudget (`policy/v1`)
- Kubernetes Deployments and StatefulSets
- `kubectl` drain, patch, scale, wait, get, and describe commands
- Prometheus alerting
- kube-state-metrics

## Sources Consulted
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes disruption concepts: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes guide for specifying a PodDisruptionBudget: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The post originally said Kubernetes respects PDBs during rolling updates. Kubernetes documentation notes that pods unavailable during rolling updates count against the budget, but workload controllers such as Deployments and StatefulSets are not themselves limited by PDBs during rollouts. Updated the explanation to clarify that PDBs are honored for voluntary evictions such as node drains and eviction-based automation, while rolling updates are not constrained by PDBs.
- The maintenance-mode script patched `maxUnavailable` onto a PDB that already had `minAvailable`. Kubernetes PDB specs allow only one of these fields. Updated the script to use JSON patch operations that remove `minAvailable` before adding `maxUnavailable`, and reverse that change when disabling maintenance mode.
- The PostgreSQL StatefulSet example claimed the PDB ensured quorum. Generic PostgreSQL replicas do not inherently use quorum semantics, and the sample StatefulSet does not define a specific replication topology. Updated the text to say that one database pod can be disrupted during voluntary evictions and that availability depends on the database replication topology being healthy.
- The monitoring command comment described `disruptionsAllowed == 0` as "currently violated." A PDB can allow zero disruptions without being violated. Updated the comment to say it lists PDBs that currently allow no voluntary disruptions.

## Review Notes
The examples use current `policy/v1` PodDisruptionBudget manifests and current `kubectl drain --delete-emptydir-data` syntax. `kubectl` was not installed in the local workspace, so CLI flag verification was performed against the official Kubernetes `kubectl` reference.
