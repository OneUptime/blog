# Validation Summary: How to Set Up Pod Disruption Budgets for High Availability

## Status
validated

## Post Type
Technical guide / Kubernetes tutorial

## Technologies Covered
- Kubernetes PodDisruptionBudget (`policy/v1`)
- Kubernetes Deployments and StatefulSets
- `kubectl drain`
- Pod topology spread constraints
- Kubernetes unhealthy pod eviction policy
- Prometheus Operator `PrometheusRule`
- kube-state-metrics PDB metrics
- PromQL

## Sources Consulted
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes API reference: PodDisruptionBudget `policy/v1` - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes documentation: Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: Safely Drain a Node - https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes `kubectl drain` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Deployments documentation - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kube-state-metrics PDB metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/poddisruptionbudget-metrics.md

## Issues Found
- The disruption diagram said PDBs protect workload rolling updates. Kubernetes documentation states that pods unavailable due to a rolling upgrade count against the disruption budget, but workload resources such as Deployments and StatefulSets are not limited by PDBs during rolling upgrades. Changed the diagram label to show workload rolling updates are controlled by rollout strategy.
- The PDB calculation formula used `floor()` for percentage-based `maxUnavailable`. Kubernetes rounds up percentage values for PDB `maxUnavailable`. Changed the formula and examples to use `ceil()`.
- The drain troubleshooting section suggested `kubectl drain ... --force` as the way to force a drain blocked by a PDB. The `--force` flag only continues for pods that do not declare a controller; `--disable-eviction` is the flag that bypasses PDB checks. Updated the command and warning text accordingly.

## Review Notes
The post uses current `policy/v1` PDB manifests and valid `minAvailable`, `maxUnavailable`, selector, topology spread, and `unhealthyPodEvictionPolicy` fields. The PDB monitoring metrics match current kube-state-metrics metric names. `kubectl` was not installed in the local environment, so CLI validation was performed against the official Kubernetes command reference.
