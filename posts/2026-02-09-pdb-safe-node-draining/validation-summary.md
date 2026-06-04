# Validation Summary: How to Configure Pod Disruption Budgets for Safe Node Draining

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- PodDisruptionBudget policy/v1 API
- kubectl drain
- Deployments and rolling updates
- StatefulSets
- DaemonSets
- Cluster Autoscaler
- Prometheus and kube-state-metrics

## Sources Consulted
- Kubernetes disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes PodDisruptionBudget policy/v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes DaemonSet apps/v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The post implied PDBs protect all voluntary disruptions, including direct pod deletion and Deployment rollouts. Updated the wording to clarify that PDBs constrain voluntary evictions through the eviction API, and that direct deletes and workload-controller rollouts are not blocked by PDBs.
- The rolling update section said Deployments terminate old pods while respecting the PDB and that an overly restrictive PDB blocks rollouts. Kubernetes documentation states rolling update unavailability counts against the budget, but workload controllers such as Deployments are not limited by PDBs during rolling upgrades. Reworded the section to separate Deployment strategy behavior from PDB-protected evictions.
- The Deployment example was missing `spec.template.metadata.labels`, so the selector would not match the pod template. Added the required `app: api-gateway` template label.
- The StatefulSet/Kafka explanation claimed the PDB prevents data loss. Reworded it to say the PDB helps maintain quorum for a three-broker cluster and reduces disruption risk.
- The DaemonSet section said drains work because DaemonSets reschedule immediately on other nodes. `kubectl drain` does not delete DaemonSet-managed pods and ignores them when `--ignore-daemonsets` is set. Corrected the explanation.
- The DaemonSet section used a percentage PDB example as the main control for DaemonSet disruption. Replaced it with the native DaemonSet rolling update `maxUnavailable` field.
- The unhealthy pods section said failed readiness allows drains even when the PDB would otherwise prevent them. Current Kubernetes behavior is more nuanced: unhealthy running pods do not count as healthy, but default eviction policy can still block them unless the application has enough healthy pods. Added the `unhealthyPodEvictionPolicy: AlwaysAllow` guidance.
- The Prometheus examples used current minus desired healthy pod metrics to infer zero allowed disruptions. Replaced them with the direct kube-state-metrics metric `kube_poddisruptionbudget_status_pod_disruptions_allowed == 0`.
- The overlapping PDB section said Kubernetes uses the most restrictive PDB. Kubernetes disallows eviction of a pod covered by multiple PDBs. Corrected the explanation.
- The testing section suggested checking whether PDBs prevented `kubectl delete pod`. PDBs do not block direct pod deletion, so the wording now reflects that the deletion is not blocked.

## Review Notes
`kubectl` was not installed in the local environment, so CLI flag validation was performed against the official generated Kubernetes `kubectl drain` reference rather than local `--help` output. The examples use current `policy/v1`, `apps/v1`, and `v1` API versions.
