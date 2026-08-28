# Validation Summary: How to Prevent Generic Ephemeral PVC Name Collisions and Ownership Conflicts

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes generic ephemeral volumes
- PersistentVolumeClaims, PersistentVolumes, StorageClasses, and CSI storage
- Pod owner references and Kubernetes garbage collection
- PVC/PV protection finalizers and reclaim policies
- `kubectl`, JSONPath, custom columns, watches, and field selectors
- ResourceQuota, LimitRange, and admission policy

## Sources Consulted

- [Kubernetes: Ephemeral Volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes API: Pod and EphemeralVolumeSource](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#EphemeralVolumeSource)
- [Kubernetes source: ephemeral volume controller](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/volume/ephemeral/controller.go)
- [Kubernetes source: generic ephemeral volume ownership helper](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/component-helpers/storage/ephemeral/ephemeral.go)
- [Kubernetes/apimachinery source: controller owner-reference checks](https://github.com/kubernetes/apimachinery/blob/master/pkg/apis/meta/v1/controller_ref.go)
- [Kubernetes: Owners and Dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)
- [Kubernetes: Garbage Collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Storage Classes and volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- [Kubernetes: CSI Volume Cloning](https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/)
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/#quota-for-storage)
- [Kubernetes: Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes: Pod update and replacement](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement)
- [Kubernetes: Jobs and mutable scheduling directives](https://kubernetes.io/docs/concepts/workloads/controllers/job/#mutable-scheduling-directives)
- [Kubernetes: Modifying a CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#modifying-a-cronjob)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes: Field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)

## Issues Found

- The ownership description did not state that the accepted Pod owner reference must be the controller owner reference. Updated it to require `controller: true` and a UID matching the current Pod, and made the final identity test include the same-namespace requirement.
- The workload-resolution advice grouped Jobs with controllers whose Pod templates can be updated. A Job's volume template is immutable, so the post now says to recreate a Job; it also clarifies that CronJob template changes affect future Jobs.
- The terminating-claim explanation conflated PVC protection with CSI backend-deletion finalizers. Updated it to distinguish `kubernetes.io/pvc-protection` on the PVC from CSI deletion protection on the backing PV.
- The named-PVC watch could exit with `NotFound` before asynchronous claim creation. Replaced it with a collection watch filtered by `metadata.name` and clarified that the two blocking watches run in separate terminals.
- The custom-columns argument contained an unquoted `[0]`, which shells such as zsh can interpret as a glob. Quoted the expression and added the controller flag to the ownership output.
- The post described replacement scratch volumes as always empty. Updated it to say they are usually empty because a claim data source or provisioner can supply initial data.
- The recovery advice suggested cloning the claim before deleting its owner Pod, but CSI cloning requires a bound source PVC that is not in use. Replaced that advice with a supported snapshot or application-level copy and documented the cloning constraint.
- The `WaitForFirstConsumer` discussion called the `Pending` phase brief even though scheduling and provisioning time is not bounded. Updated it to say that `Pending` can be normal while topology is selected.

## Review Notes

Generic ephemeral volumes have been stable since Kubernetes 1.23. The YAML Pod-spec fragment uses current Kubernetes fields and passes client-side validation; the Bash assignments, JSONPath expressions, and remaining `kubectl` commands are current. The example image and `scratch-csi` StorageClass are illustrative and must exist in the target environment.
