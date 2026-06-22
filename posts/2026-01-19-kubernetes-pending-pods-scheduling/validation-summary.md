# Validation Summary: How to Fix Pending Pods That Never Schedule

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Pods and scheduling
- kubectl
- Kubernetes node selectors, affinity, taints, and tolerations
- Kubernetes PersistentVolumeClaims and StorageClasses
- Kubernetes ResourceQuota
- Kubernetes PriorityClass and preemption
- Kubernetes Cluster Autoscaler

## Sources Consulted
- Kubernetes documentation: Kubernetes Scheduler - https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes documentation: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes documentation: Persistent Volumes - https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes documentation: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes API reference: PriorityClass v1 - https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes kubectl reference: get, describe, label, taint - https://kubernetes.io/docs/reference/kubectl/
- Kubernetes Autoscaler documentation: Cluster Autoscaler on AWS - https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Autoscaler FAQ - https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The Cluster Autoscaler Deployment example was not a valid `apps/v1` Deployment because `spec.selector.matchLabels` did not have matching labels under `spec.template.metadata.labels`. Added matching pod template labels.
- The Cluster Autoscaler example implied a standalone Deployment was sufficient. Added `serviceAccountName: cluster-autoscaler` and a note that required ServiceAccount/RBAC and cloud IAM permissions are also needed, and that the autoscaler version should match the Kubernetes cluster minor version.
- The ResourceQuota section described quota exhaustion as a Pending pod scheduling cause. Kubernetes ResourceQuota failures normally reject new object creation during admission. Updated the section title and explanation to frame this as a related controller symptom where pods are not created.

## Review Notes
Most scheduler-related examples, including node selector checks, taint removal syntax, toleration forms, required/preferred affinity fields, PVC diagnostics, `WaitForFirstConsumer` behavior, `kubectl uncordon`, and PriorityClass syntax are consistent with current Kubernetes documentation. The Cluster Autoscaler snippet remains abbreviated and AWS-specific; a production install should follow the provider-specific autoscaler manifest, RBAC, and IAM guidance.
