# Validation Summary: How to Debug Kubernetes Pods Stuck in Pending State

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Pods and pod lifecycle
- Kubernetes scheduler
- Kubernetes resource requests and limits
- Kubernetes node selectors and node affinity
- Kubernetes taints and tolerations
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- Kubernetes ResourceQuota
- kubectl CLI

## Sources Consulted
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl top node reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/

## Issues Found
- The introduction stated that a Pending pod means the scheduler cannot find a suitable node and that Pending pods never start. Kubernetes defines Pending more broadly: a pod can be Pending before scheduling and while containers are being prepared, such as during image downloads. I changed the wording to focus on pods stuck Pending due to scheduling failures.
- The post said it covered every reason a pod might be stuck. That was too broad for a guide focused on scheduler placement, taints, affinity, PVCs, and quotas. I changed it to "common scheduling-related reasons."
- The resource section said the scheduler looks for enough free CPU or memory. Kubernetes scheduling is based on resource requests against node capacity/allocatable accounting, not current live usage alone. I changed the wording to refer to allocatable CPU and memory remaining after existing pod requests are accounted for.
- The PVC section stated that any pod referencing an unbound PVC will stay Pending. This is accurate for immediate-binding PVC scheduling failures, but StorageClasses can use WaitForFirstConsumer, where binding is intentionally delayed until pod scheduling. I changed the wording to specify immediate-binding PVCs.
- The ResourceQuota section was listed as a Pending pod cause, but quota violations normally reject pod creation at admission time and surface as controller FailedCreate events. I changed the wording to say quotas can prevent pod creation and may result in no Pending pod object.

## Review Notes
The kubectl commands and Kubernetes YAML snippets use current API groups and field names. I could not run kubectl locally because it is not installed in this environment, so CLI validation was performed against official Kubernetes kubectl reference documentation.
