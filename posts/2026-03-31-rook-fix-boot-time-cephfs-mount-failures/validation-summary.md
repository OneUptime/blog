# Validation Summary: How to Fix Boot-Time CephFS Mount Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (Ceph storage orchestrator for Kubernetes)
- CephFS (Ceph distributed filesystem)
- Kubernetes CSI (Container Storage Interface)
- Ceph Reef (v18.2.0)
- Linux kernel module management (modprobe, /etc/modules-load.d)

## Sources Consulted
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook CSI driver documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/)
- Ceph documentation on CephFS kernel driver (https://docs.ceph.com/en/reef/cephfs/)
- Kubernetes CSI specification and volume mount paths
- Linux modprobe and modules-load.d documentation

## Issues Found

### Issue 1: Misleading description of health check configuration (Step 5)
- **What was wrong:** The text stated "Ensure the CSI node plugin waits for the Ceph cluster to be healthy" when describing the `healthCheck.daemonHealth` configuration. This is incorrect — the health check intervals control how frequently the Rook operator polls daemon health status, not CSI driver startup ordering. The CSI node plugin is a DaemonSet that starts independently of these settings.
- **What was changed:** Reworded to: "Tuning the health check intervals helps the Rook operator detect and recover unhealthy Ceph daemons faster after a reboot, reducing the window where mount failures can occur."
- **Why:** The original phrasing implied a causal relationship between health check config and CSI startup that does not exist. The corrected text accurately describes what the configuration achieves.

### Issue 2: Incorrect init container readiness check and misleading section title (Step 6)
- **What was wrong:** The section was titled "Use NodeAffinity and Readiness Gates" but the example showed neither — it used an init container. Additionally, the init container checked for `/dev/ceph-*` block devices, which is an RBD (RADOS Block Device) pattern. CephFS does not create block devices; it uses kernel filesystem mounts. The check would never succeed for a CephFS-only deployment.
- **What was changed:** Renamed the section to "Use Init Containers to Wait for Ceph Readiness." Replaced the `/dev/ceph-*` device check with a DNS resolution check against the Ceph monitor service (`nslookup rook-ceph-mon-a.rook-ceph.svc.cluster.local`), which is a valid indicator that the Ceph cluster is coming online. Added a note to replace the monitor name with the actual service name in the deployment.
- **Why:** The original check would always fail for CephFS workloads. DNS resolution of the monitor service is a lightweight, CephFS-appropriate readiness signal that works from within any pod using only busybox utilities.

## Review Notes
- The `--previous` flag in Step 2's `kubectl logs` command is useful for crashed containers but will error if there is no previous container instance. Users may want to try without `--previous` first for currently running pods. This is an operational nuance, not a technical error.
- The Ceph image `quay.io/ceph/ceph:v18.2.0` (Reef) is current as of this review. Future Ceph releases may warrant updating the image reference.
- The CephCluster YAML in Step 5 is syntactically correct and uses valid CRD fields for Rook v1.
- All kubectl commands, mount paths, and kernel module operations are technically correct.
