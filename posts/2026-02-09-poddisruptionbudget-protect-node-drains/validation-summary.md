# Validation Summary: How to Use PodDisruptionBudget to Protect Workloads During Node Drains

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- PodDisruptionBudget
- kubectl drain
- Kubernetes topology spread constraints
- PrometheusRule / kube-state-metrics PDB metrics
- jq

## Sources Consulted
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: API-initiated Eviction - https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
- Kubernetes API reference: PodDisruptionBudget policy/v1 - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes kubectl reference: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- kube-state-metrics PodDisruptionBudget metrics reference - https://github.com/kubernetes/kube-state-metrics/tree/main/docs

## Issues Found
- Corrected the introduction to say `kubectl drain` tries to evict eligible pods, because Kubernetes drain does not delete mirror pods, skips DaemonSet-managed pods, and has additional controller ownership rules.
- Changed wording from "running" to "available" for PDB guarantees, matching Kubernetes' Ready/healthy pod semantics.
- Quoted the percentage PDB value as `"75%"`, matching Kubernetes documentation that percentage IntOrString values are string representations.
- Replaced the overlapping PDB example. The Eviction API treats multiple PDBs matching the same pod as a misconfiguration, so the post now shows patching one existing PDB for stricter critical-period behavior.
- Clarified the multi-zone example comment so the PDB is described as a global availability budget, not a per-zone guarantee.
- Added the missing namespace flag to PDB status and patch commands that operate on the `production` namespace examples.
- Fixed the troubleshooting command so pod labels are valid JSON for `jq`, pods are checked across namespaces, and PDBs are matched only within the pod's namespace.

## Review Notes
- `kubectl` is not installed in this workspace, so command behavior was verified against the official Kubernetes `kubectl drain` reference rather than local `--help` output.
- The embedded YAML snippets were parsed successfully with Python/PyYAML.
