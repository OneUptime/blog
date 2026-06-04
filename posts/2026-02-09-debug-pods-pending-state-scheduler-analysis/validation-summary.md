# Validation Summary: How to Debug Pods Stuck in Pending State with Event and Scheduler Analysis

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes Pods and pod lifecycle
- Kubernetes scheduling and kube-scheduler
- kubectl commands
- Node selectors, taints, tolerations, and affinity rules
- PersistentVolumeClaims and StorageClasses
- ResourceQuotas
- PrometheusRule alerts

## Sources Consulted
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Scheduler: https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Static Pods: https://kubernetes.io/docs/concepts/workloads/pods/static-pods/
- Kubernetes kube-scheduler command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post defined Pending as only an unscheduled state and said no containers are created. Updated the description to match Kubernetes' definition: Pending includes time before scheduling and time spent setting up containers or downloading images.
- The event sorting command used `.lastTimestamp`, a legacy Event field. Changed it to `.metadata.creationTimestamp`, which is the current Kubernetes quick-reference example for sorting events by timestamp.
- The resource availability explanation compared pod requests to generic "available capacity." Clarified that scheduling compares requests against allocatable capacity not already consumed by other requests.
- The PVC section stated that any pending PVC prevents scheduling. Clarified that this is true for immediate binding, while `WaitForFirstConsumer` intentionally delays binding until a pod using the PVC is created and scheduling can pick a node.
- The ResourceQuota section could imply that quota exhaustion creates Pending pods. Clarified that Kubernetes rejects pod creation with a forbidden error when a ResourceQuota would be exceeded.
- The scheduler verbosity instructions assumed kube-scheduler is a Deployment. Clarified that kubeadm commonly runs kube-scheduler as a static Pod and the static manifest must be updated in that case.
- The PrometheusRule example had `groups` at the top level, which is not a complete Prometheus Operator CRD. Updated it to include `apiVersion`, `kind`, `metadata`, and `spec.groups`.

## Review Notes
The remaining examples are generally accurate for current Kubernetes usage, but some commands are cluster-provider dependent. `kubectl` was not installed in the review workspace, so CLI verification was performed against official Kubernetes documentation rather than local command help.
