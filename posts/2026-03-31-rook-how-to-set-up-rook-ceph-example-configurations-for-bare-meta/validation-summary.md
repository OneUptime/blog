# Validation Summary: How to Set Up Rook-Ceph Example Configurations for Bare Metal

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system, Reef v18.2.0)
- Kubernetes (node labeling, taints/tolerations, node affinity, kubectl debug)
- CephCluster Custom Resource (ceph.rook.io/v1 API)
- Bare metal storage configuration (raw block devices, NVMe, device filtering)

## Sources Consulted
- Rook-Ceph CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook-Ceph storage configuration examples (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#storage-selection-settings)
- Kubernetes kubectl debug documentation (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- Kubernetes node affinity and tolerations documentation (https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- Ceph Reef (v18) release notes and documentation (https://docs.ceph.com/en/reef/)
- Cross-referenced with other Rook-Ceph blog posts in this repository for consistency of CRD field usage

## Issues Found
1. **Missing `--image` flag in `kubectl debug` command (Prerequisites section):**
   - **What was wrong:** The command `kubectl debug node/$node -- chroot /host lsblk ...` was missing the required `--image` and `-it` flags. The `--image` flag is required by `kubectl debug node/` to specify the container image for the debugging pod. Without it, the command fails. The `-it` flags are needed to attach to the pod's stdout and display the output.
   - **What was changed:** Updated to `kubectl debug -it --image=busybox node/$node -- chroot /host lsblk ...`
   - **Why:** `kubectl debug node/<name>` creates an ephemeral pod on the target node with the host filesystem mounted at `/host`. The `--image` flag is mandatory to specify which container image to use. `busybox` is a minimal image that supports `chroot`, and `lsblk` is executed from the host filesystem via chroot.

## Review Notes
- All CephCluster CRD YAML configurations use correct field names and valid values for the Rook v1 API.
- The Ceph image `quay.io/ceph/ceph:v18.2.0` (Reef) is a valid and current release.
- The `ceph osd tree` example output is truncated to show only one host for brevity, but the root weight (3.63998) is consistent with 3 hosts each contributing ~1.21333, which matches the 3-node configuration described.
- The device filter regex patterns (`^sd[b-z]`, `^nvme[0-9]n[0-9]`) are correct for their intended purpose, though `^nvme[0-9]+n[0-9]+` would be more robust for systems with more than 10 NVMe devices.
- The recommendation to use `/dev/disk/by-id/` paths over device names (sdb/sdc) is sound best-practice advice, as device names can change between reboots.
- Resource requests and limits for mgr, mon, and osd daemons are reasonable for production bare metal deployments.
