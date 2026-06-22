# Validation Summary: How to Debug Pending Pod Status Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Pods and pod lifecycle
- Kubernetes scheduler
- kubectl commands
- Node selectors, taints, tolerations, affinity, and anti-affinity
- PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- ResourceQuota
- Pod priority and preemption
- Cluster Autoscaler
- Prometheus alerting

## Sources Consulted
- Kubernetes Pod lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Debug Pods: https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/
- Kubernetes Scheduler: https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/
- Kubernetes Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Node Autoscaling: https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/
- Kubernetes Autoscaler project: https://github.com/kubernetes/autoscaler

## Issues Found
- The introduction stated that Pending always means Kubernetes cannot schedule the pod. Kubernetes defines Pending more broadly: the pod has been accepted, but one or more containers have not been created, which can include scheduling delay and image pulling after node assignment. Updated the wording to distinguish these cases.
- The resource-pressure section recommended deleting Succeeded pods to free node resources. Completed pods do not normally free schedulable CPU and memory capacity in the way deleting running workloads does. Updated the guidance to scale down or delete unused running workloads.
- The ResourceQuota section implied quota exhaustion commonly leaves pods Pending. ResourceQuota violations are normally rejected during API admission, so the workload may fail to create pods instead. Updated the heading and explanation.
- The priority section said low-priority pods wait for high-priority pods first. The more precise behavior is that higher-priority pods are sorted ahead in scheduling and can preempt lower-priority pods when preemption is enabled. Updated the explanation.
- The debugging workflow described `kubectl apply --dry-run=server` as a scheduling simulation. Server-side dry-run validates the object and admission checks, but does not simulate scheduler placement. Renamed the step and corrected the comment.
- The Cluster Autoscaler example used a non-upstream `autoscaling.k8s.io/v1` `ClusterAutoscaler` API object. Upstream Kubernetes does not provide that built-in API. Replaced the invalid manifest with provider-specific installation guidance.

## Review Notes
Most commands and Kubernetes snippets were technically valid after the corrections. The article remains version-neutral; provider-specific Cluster Autoscaler setup should be documented separately if the post later targets EKS, GKE, AKS, Cluster API, or OpenShift.
