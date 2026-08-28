# Validation Summary: How to Migrate a Workload from emptyDir to Generic Ephemeral Storage

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Kubernetes
- `emptyDir` volumes and local ephemeral-storage accounting
- Generic ephemeral volumes and generated PersistentVolumeClaims
- CSI dynamic provisioning
- StorageClasses, topology-aware binding, and reclaim policies
- Deployments, StatefulSets, DaemonSets, Jobs, and CronJobs
- ResourceQuota and LimitRange storage controls
- `kubectl`

## Sources Consulted

- [Kubernetes: Ephemeral Volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#generic-ephemeral-volumes)
- [Kubernetes: Volumes (`emptyDir`)](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes: Local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes: Limit Storage Consumption](https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/)
- [Kubernetes: Pods—update and replacement](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes: DaemonSets](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes: CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#modifying-a-cronjob)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl exec`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes: `kubectl rollout`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/)
- [Kubernetes: kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Kubernetes: Deprecated API Migration Guide—Events](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event)
- [Kubernetes upstream `kubectl get` implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/get/get.go)

## Issues Found

- The original example paired a 10 GiB disk-backed `emptyDir.sizeLimit` with a 4 GiB aggregate Pod `ephemeral-storage` limit. Because disk-backed `emptyDir`, container logs, and writable layers all count toward the Pod limit, the Pod could become eligible for eviction around 4 GiB total usage. Changed the container limit to 12 GiB in both the before and after snippets so the original 10 GiB volume limit is meaningful and the migration examples remain consistent.
- `kubectl get pod,pvc ... -w` cannot watch multiple resource types in one invocation. Removed `-w` so the combined Pod/PVC query works.
- Event sorting used the legacy `lastTimestamp` field. Replaced it with the current official quick-reference form, `.metadata.creationTimestamp`.
- Shell examples used angle-bracket placeholders, which shells parse as redirections and, in the assignment, invalid syntax. Replaced them with shell-safe placeholder values assigned to variables and quoted those variables in commands.
- The rollback text could direct readers to roll back a paused Deployment revision before resuming it. Replaced the ambiguous sequence with explicit `kubectl rollout resume` followed by `kubectl rollout undo`, because Kubernetes cannot roll back a paused Deployment.
- “New Job revision” implied a revision mechanism that Kubernetes Jobs do not provide. Changed it to “a new Job with a new name”; the existing Job's volume-bearing Pod template cannot be migrated in place.

## Review Notes

- Generic ephemeral volumes being stable since Kubernetes 1.23 remains accurate.
- CSI-specific capabilities such as snapshots, cloning, expansion, topology, capacity tracking, and cleanup timing remain driver-dependent, as the post notes.
- The StorageClass and Deployment fields were checked against current APIs, and a complete manifest assembled from the snippets passed `kubectl create --dry-run=client` with kubectl v1.34.1.
- All links in the post resolve to the intended official Kubernetes documentation.
