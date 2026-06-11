# Validation Summary: How to Create Kubernetes Pod Disruption Budget Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes PodDisruptionBudget (`policy/v1`)
- Kubernetes Deployments and StatefulSets (`apps/v1`)
- `kubectl drain`, `kubectl get`, `kubectl describe`, and `kubectl scale`
- Horizontal Pod Autoscaler (`autoscaling/v2`)
- Kubernetes topology spread constraints and pod anti-affinity
- PrometheusRule and kube-state-metrics PDB metrics
- `jq` for Kubernetes JSON output processing

## Sources Consulted
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes API reference: PodDisruptionBudget `policy/v1` - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes documentation: Safely Drain a Node - https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes generated reference: `kubectl drain` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes documentation: StatefulSets - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes API reference: HorizontalPodAutoscaler `autoscaling/v2` - https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- kube-state-metrics PDB metrics reference - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/poddisruptionbudget-metrics.md

## Issues Found
- The label-expression PDB example used `maxUnavailable` across a selector that could match pods from multiple controllers. Kubernetes documentation notes that `maxUnavailable` is intended for pods with the same associated controller, so the example was changed to `minAvailable`.
- The `kubectl describe pdb` sample used `Expected`, but current `kubectl describe` output reports `Total`. The sample output and key-field explanation were corrected.
- Emergency drain examples claimed that `--force` bypasses PDB protection. Official `kubectl drain` docs state that `--disable-eviction` bypasses eviction and PDB checks, while `--force` is for unmanaged pods. The commands and comments were corrected.
- The relaxed maintenance PDB used a different object name with the same selector, which would create overlapping PDBs instead of replacing the normal budget. The example now keeps the same PDB name so `kubectl apply` updates the existing budget.
- Several `apps/v1` example manifests were incomplete. Deployment examples now include required selectors, matching template labels, and minimal containers; the StatefulSet example now includes a headless Service and `serviceName`.
- The PostgreSQL StatefulSet example was labeled quorum-based even though the manifest did not configure a quorum database cluster. The heading and comment were adjusted to describe it as a stateful database example without claiming quorum behavior.
- The deployment/PDB discovery script used `kubectl jsonpath` output as if it were JSON. It now uses `kubectl get ... -o json | jq -c` before passing the selector to `jq fromjson`.

## Review Notes
The post is technically relevant and current for Kubernetes `policy/v1` PDBs. `kubectl` was not installed in the review environment, so CLI behavior was verified against the official generated `kubectl drain` reference rather than local `--help` output.
