# Validation Summary: How to Decommission a Rook-Ceph Cluster Safely

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (v1.16 referenced, current releases up to v1.19+)
- Ceph (BlueStore, OSD, RGW, CephFS)
- Kubernetes (kubectl, DaemonSets, namespaces, CRDs, finalizers)
- Helm
- Linux disk management (sgdisk, dd, blkdiscard, LVM)
- jq (JSON processing)

## Sources Consulted
- Rook official teardown documentation: https://rook.io/docs/rook/latest/Getting-Started/ceph-teardown/
- Rook GitHub repository (release-1.16 branch confirmed to exist): https://github.com/rook/rook
- Kubernetes API documentation for namespace finalize subresource: https://kubernetes.io/docs/reference/kubernetes-api/
- Kubernetes well-known labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- GNU coreutils dd documentation (oflag=direct flag validation)
- sgdisk man page (--zap-all flag validation)

## Issues Found

### Issue 1: Missing StatefulSet handling in Step 1
- **What was wrong:** The text stated "Scale down all deployments and statefulsets using Rook-backed PVCs" but the command only handled Deployments. StatefulSets are commonly used with persistent storage and were not being scaled down.
- **What was changed:** Added a separate command block to scale down StatefulSets using the same jq filtering pattern.
- **Why:** StatefulSets (databases, message queues, etc.) are among the most common consumers of Rook-Ceph PVCs. Omitting them could leave workloads running against storage being decommissioned.

### Issue 2: Unnecessary `hostPID: true` in cleanup DaemonSet (Step 9)
- **What was wrong:** The DaemonSet spec included `hostPID: true`, which shares the host PID namespace with the container. The container only runs `rm -rf /rootfs/var/lib/rook` and has no need to see or interact with host processes.
- **What was changed:** Removed the `hostPID: true` line from the DaemonSet spec.
- **Why:** `hostPID: true` unnecessarily widens the container's attack surface. The privileged security context and hostPath volume mount at `/` are sufficient for file deletion.

### Issue 3: Incorrect labels in Step 11
- **What was wrong:** The command removed `topology.kubernetes.io/zone`, which is a standard Kubernetes well-known label set by cloud providers and the kubelet. This label is NOT Rook-specific and is used by the Kubernetes scheduler (topologySpreadConstraints), CSI drivers, and service routing. Removing it could break scheduling and topology-aware features for all other workloads. The `role` label was also generic and not Rook-specific.
- **What was changed:** Replaced with Rook-specific labels (`ceph.rook.io/DeviceSet-` and `storage-node-`) that are actually applied by Rook or by operators during Rook setup.
- **Why:** Only labels applied as part of the Rook deployment should be removed during decommission. Standard Kubernetes topology labels must be preserved.

## Review Notes
- The `release-1.16` branch referenced in Step 6 for common.yaml and crds.yaml URLs is a valid Rook branch. However, users should update this to match the version they actually have deployed, as CRD schemas differ between versions.
- The Step 1 command scales down ALL deployments with any PVC, not just those using Rook-specific StorageClasses. In a full decommission scenario this is acceptable as a conservative approach, but users with mixed storage backends should filter by StorageClass.
- The namespace finalizer removal technique in Step 8 using Python is correct but less idiomatic than using jq (`jq '.spec.finalizers = []'`), which is more commonly available in Kubernetes operations environments.
- The `cleanupPolicy.confirmation` value `"yes-really-destroy-data"` was verified against official Rook documentation and is correct.
- The disk wiping commands (sgdisk, dd with oflag=direct, blkdiscard) are all correct and standard practice for OSD disk cleanup.
