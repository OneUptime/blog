# Validation Summary: How to Handle Pod Disruption During Deployment with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments
- Kubernetes PodDisruptionBudgets
- Kubernetes node drains and Eviction API behavior
- Kubernetes topology spread constraints and node affinity
- Kubernetes container lifecycle hooks
- Prometheus Operator PrometheusRule
- kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Disruptions and PodDisruptionBudgets - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: Specifying a PodDisruptionBudget - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: PodDisruptionBudget API reference - https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes documentation: Update a Deployment Without Downtime - https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes documentation: Container Lifecycle Hooks - https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Argo CD documentation: Resource Health - https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD documentation: Application Specification Reference - https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- kube-state-metrics documentation: Pod metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The post described "ArgoCD rolling updates" as a voluntary disruption. Argo CD applies the desired Deployment spec; Kubernetes performs the rolling update. Updated the wording to distinguish Argo CD sync from the Kubernetes Deployment controller.
- The PDB discussion implied that PDBs directly limit rolling updates. Kubernetes documentation says pods unavailable during rolling updates count against a disruption budget, but workload controllers are not limited by PDBs during their own rollouts. Added that nuance and clarified that Deployment strategy controls rollout availability.
- Several `apps/v1` Deployment examples omitted the required `.spec.selector` and matching pod-template labels. Added selectors and `template.metadata.labels` so the examples are structurally valid manifests.
- The rollout/PDB interaction overstated PDB protection for "external factors." PDBs limit voluntary evictions through the Eviction API and do not prevent involuntary failures. Updated the wording accordingly.
- The node drain explanation said drains wait "with a timeout." Kubernetes documents this as a configurable timeout. Updated the sentence to avoid implying a fixed/default timeout.
- The spot-instance node affinity example used `node.kubernetes.io/lifecycle`, which is not a Kubernetes well-known label. Replaced it with a custom/provider-specific placeholder label and added a comment to replace it with the user's real capacity label.
- The Argo CD retry explanation tied retry behavior specifically to unschedulable pods. Applying a Deployment can succeed even if pods later fail to schedule, so the retry wording was narrowed to failed sync operations or temporarily rejected API operations.
- The Prometheus alert used `increase()` over `kube_pod_status_reason`, a gauge from kube-state-metrics. Changed it to alert on the current count of evicted pods and renamed the alert accordingly.
- The best-practice note said node drains can evict all pods of a service simultaneously. Narrowed this to all matching pods on drained nodes, which is the accurate scope.

## Review Notes
The examples assume supporting components are installed where needed: Argo CD for Application resources, Prometheus Operator for PrometheusRule, and kube-state-metrics for the referenced metrics. Kubernetes now recommends considering `unhealthyPodEvictionPolicy: AlwaysAllow` for PDBs during drains of unhealthy pods; that could be a useful future enhancement, but it was not required to make the existing post technically correct.
