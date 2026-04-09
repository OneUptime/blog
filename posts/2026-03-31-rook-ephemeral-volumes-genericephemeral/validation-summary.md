# Validation Summary: How to Use Ephemeral Volumes (GenericEphemeralVolume) with Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes (GenericEphemeralVolume feature, stable since 1.23)
- Rook (Ceph storage orchestrator for Kubernetes)
- Ceph CSI drivers (RBD and CephFS)
- Kubernetes Jobs (batch/v1)

## Sources Consulted
- Kubernetes Ephemeral Volumes documentation: https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/
- KEP-1698 Generic Ephemeral Volumes: https://github.com/kubernetes/enhancements/blob/master/keps/sig-storage/1698-generic-ephemeral-volumes/README.md
- Kubernetes 1.23 Release Notes: https://kubernetes.io/blog/2021/12/07/kubernetes-1-23-release-announcement/
- Rook Ceph CSI Drivers documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/

## Issues Found

### Issue 1: Incorrect claim about sharing ephemeral volumes across parallel Job pods
- **What was wrong:** The CephFS section stated that `ReadWriteMany` ephemeral volumes are useful "when a job spawns multiple pods (via a Job with parallelism) that need to share a working directory." This is incorrect — GenericEphemeralVolumes create a PVC per pod (named `<pod-name>-<volume-name>` with the pod as owner), so each pod in a parallel Job gets its own independent volume. They cannot be shared across pods.
- **What was changed:** Replaced the paragraph to clarify that CephFS ephemeral volumes provide POSIX filesystem semantics for per-pod storage, and that sharing across parallel pods requires a regular PVC.
- **Why:** The original claim could mislead users into expecting shared storage across parallel Job pods, which would result in each pod getting separate isolated storage instead.

### Issue 2: Inaccurate PVC cleanup lifecycle description
- **What was wrong:** The lifecycle section stated that "When the pod terminates (either successfully or due to failure), Kubernetes garbage-collects the PVC automatically." The PVC is actually garbage-collected when the pod *object is deleted* from the API server, not when the pod merely terminates. A terminated pod persists as an API object until explicitly deleted or cleaned up by a controller (e.g., the Job controller).
- **What was changed:** Corrected "when the pod terminates" to "when the pod object is deleted from the cluster" and added a note that terminated pods persist as API objects until explicitly deleted or cleaned up by a controller.
- **Why:** This distinction matters especially for the bare Pod example in the post. A user creating a standalone Pod would find that the PVC persists after the pod's containers exit, potentially causing confusion or storage leaks if they expect automatic cleanup on termination.

## Review Notes
- All YAML examples are syntactically correct and use valid Kubernetes API fields.
- The StorageClass names `rook-ceph-block` and `rook-cephfs` match Rook's default naming conventions.
- The PVC naming convention `<pod-name>-<volume-name>` shown in the example output (`batch-job-scratch`) is correct per KEP-1698.
- The claim that GenericEphemeralVolume became stable in Kubernetes 1.23 is verified correct.
- The Job example correctly uses `restartPolicy: OnFailure`, which is valid for Jobs and ensures the ephemeral volume persists across container restarts within the same pod.
