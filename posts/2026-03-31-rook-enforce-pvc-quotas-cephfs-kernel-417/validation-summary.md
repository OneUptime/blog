# Validation Summary: How to Enforce PVC Quotas with CephFS in Rook (Kernel 4.17+)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- CephFS directory-level quotas
- Kubernetes PersistentVolumeClaims (PVC)
- Ceph CSI driver (ceph-csi)
- Linux kernel CephFS client

## Sources Consulted
- CephFS Quotas documentation: https://docs.ceph.com/en/latest/cephfs/quota/
- CephFS Volumes and Subvolumes documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Rook Ceph CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook CephFilesystemSubVolumeGroup CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-fs-subvolumegroup-crd/
- Kubernetes Strategic Merge Patch specification: https://github.com/kubernetes/community/blob/master/contributors/devel/sig-api-machinery/strategic-merge-patch.md
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Red Hat Ceph Storage 7 CephFS quotas: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/7/html/file_system_guide/ceph-file-system-quotas

## Issues Found

### 1. Container name mismatch in `kubectl run --overrides` (Testing section)
- **What was wrong:** The `--overrides` JSON specified a container named `"t"`, while `kubectl run quota-test` generates a container named `"quota-test"`. Because `kubectl run --overrides` uses strategic merge patch and the containers list merges by the `name` key, this would create a pod with **two containers** instead of one. Consequently, `kubectl logs quota-test` would fail with an error requiring a `-c` flag to select a container.
- **What was changed:** Renamed the container in `--overrides` from `"name":"t"` to `"name":"quota-test"` so the override merges correctly with the generated container spec, producing a single-container pod.
- **Why:** This ensures the command works as described and `kubectl logs quota-test` returns the dd output without needing a container selector.

### 2. Subvolume group name passed as positional argument instead of named flag
- **What was wrong:** The `ceph fs subvolume getpath` and `ceph fs subvolume info` commands passed the subvolume group name (`csi`) as a positional argument (e.g., `ceph fs subvolume getpath myfs <name> csi`). While positional arguments may work in practice with some Ceph versions, the official documented syntax uses the `--group_name` flag.
- **What was changed:** Updated all three occurrences to use `--group_name=csi` (e.g., `ceph fs subvolume getpath myfs <name> --group_name=csi`).
- **Why:** Using the documented flag syntax ensures compatibility across Ceph versions and matches the official CLI reference.

## Review Notes
- The `grep bytes_quota` output is shown as a clean JSON object (`{"bytes_quota": 5368709120}`), but in practice `grep` would output just the matching line from the larger JSON output. This is a minor presentational choice, not a technical error -- the value shown is correct.
- The post correctly notes that CephFS quotas are cooperative (enforced by the client), which is an important caveat. On kernels < 4.17, the kernel client does not enforce them even though the metadata is set.
- The StorageClass, PVC spec, provisioner name, secret names, and all other configuration snippets are accurate for standard Rook deployments in the `rook-ceph` namespace.
- The `bytes_quota` value of 5368709120 is correctly computed (5 GiB = 5 x 1024^3 = 5,368,709,120 bytes).
