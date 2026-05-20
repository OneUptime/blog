# Validation Summary: How to Handle Pod Evictions with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes pod eviction and disruption handling
- Kubernetes Deployments
- PodDisruptionBudgets
- PriorityClasses and preemption
- Argo CD notifications and custom health checks
- Cluster Autoscaler
- kubectl

## Sources Consulted
- Kubernetes: Disruptions, https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes: Node-pressure Eviction, https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes: API-initiated Eviction, https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
- Kubernetes: Deployments, https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: Specifying a PodDisruptionBudget, https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes: Container Lifecycle Hooks, https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes: kubectl drain reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes: Pod Priority and Preemption, https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes: Pod Quality of Service Classes, https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes: Assign Memory Resources to Containers and Pods, https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Argo CD: Automated Sync Policy, https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD: Application Specification Reference, https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD: Resource Health, https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD: Notifications Overview, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD: Notification Triggers, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD: Notification Templates, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Kubernetes Autoscaler FAQ, https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The eviction type diagram listed OOMKill as a node-pressure eviction type. Kubernetes treats container OOM kills and kubelet node-pressure pod evictions as related but distinct behaviors, so the diagram now says "Memory pressure."
- The PDB section said PDBs are the primary defense against disruptive evictions in general. PDBs limit voluntary disruptions, so the sentence now says "voluntary disruptive evictions."
- The Deployment example used `apps/v1` but omitted the required `.spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the manifest is valid.
- The node drain section said pods receive SIGTERM followed by a grace period. Kubernetes starts the grace period first, runs `preStop` before sending the stop signal, and forcefully terminates containers that exceed the grace period. Updated the sentence to reflect that sequence.
- The PriorityClass section said high-priority workloads are less likely to be preempted by lower-priority workloads. Lower-priority pods do not preempt higher-priority pods; high priority mainly makes pods less likely to be preempted and lets them preempt lower-priority pods when scheduling requires it. Updated the wording.

## Review Notes
The remaining snippets use current Kubernetes APIs such as `policy/v1` PodDisruptionBudget and `scheduling.k8s.io/v1` PriorityClass. The Cluster Autoscaler `safe-to-evict` annotation is valid, but it should remain a narrow exception because it can block scale-down. The event query is syntactically valid, although event retention and field availability can vary by cluster version and event backend.
