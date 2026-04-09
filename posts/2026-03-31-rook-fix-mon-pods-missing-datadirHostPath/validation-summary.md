# Validation Summary: How to Fix MON Pods Restarting Due to Missing dataDirHostPath

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator for Ceph)
- Ceph (distributed storage system, MON daemons)
- Kubernetes (kubectl, DaemonSets, PersistentVolumeClaims, node debugging)

## Sources Consulted
- Rook Ceph CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Kubernetes kubectl debug node documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- k8s.gcr.io registry freeze announcement: https://kubernetes.io/blog/2023/02/06/k8s-gcr-io-freeze-announcement/
- registry.k8s.io pause image releases: https://github.com/kubernetes/kubernetes/blob/master/build/pause/

## Issues Found
1. **Incorrect host filesystem path in `kubectl debug node` command**: The command `kubectl debug node/$NODE --image=busybox -- ls -la /var/lib/rook/` was using the container's root filesystem instead of the host's. When using `kubectl debug node`, the host root filesystem is mounted at `/host` inside the debug container. Changed to `/host/var/lib/rook/` to match the actual mount point (consistent with the rest of the post which correctly uses `/host` prefix).

2. **Unnecessary `hostPID: true` in DaemonSet spec**: The DaemonSet only creates a directory via a hostPath volume mount, so `hostPID: true` (which shares the host PID namespace) is completely unnecessary. It is also a security anti-pattern — prohibited at the Kubernetes Baseline Pod Security Standard level because it enables privilege escalation. Removed the field.

3. **Deprecated pause container image**: `gcr.io/google_containers/pause:3.1` uses the long-deprecated `gcr.io/google_containers` registry (frozen since April 2023) and a very old image version. Updated to `registry.k8s.io/pause:3.10` which uses the current official Kubernetes container registry and a current image version.

## Review Notes
- The PVC-backed monitors section correctly shows the `spec.mon.volumeClaimTemplate` structure. For production use, the associated StorageClass should ideally use `volumeBindingMode: WaitForFirstConsumer`, but this is a StorageClass concern rather than a CephCluster spec issue, so not a bug in the post.
- The monitor recovery commands (`delete deploy` + `ceph mon remove`) are correct and represent the standard approach for removing a monitor whose data has been lost.
- The error messages shown are representative examples, not exact Rook log output — this is acceptable for a troubleshooting guide.
