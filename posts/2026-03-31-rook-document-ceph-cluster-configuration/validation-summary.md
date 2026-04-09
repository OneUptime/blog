# Validation Summary: How to Document Your Ceph Cluster Configuration

## Status
validated

## Post Type
Guide / Template Reference

## Technologies Covered
- Ceph (v19.2.0 Squid)
- Rook (v1.16.0)
- Kubernetes (CronJob API batch/v1)
- Kustomize / GitOps
- CRUSH map tooling (crushtool)

## Sources Consulted
- Ceph Squid (v19.2.0) release notes — https://docs.ceph.com/en/latest/releases/squid/
- Ceph configuration reference (`ceph config dump`) — https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Ceph pool operations (`ceph osd pool ls detail`) — https://docs.ceph.com/en/latest/rados/operations/pools/
- CRUSH map editing guide (`getcrushmap`, `crushtool -d`) — https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/
- BlueStore configuration reference (`bluestore_cache_size_ssd`) — https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- RGW configuration reference (`rgw_max_chunk_size`) — https://docs.ceph.com/en/latest/radosgw/config-ref/
- OSD configuration reference (`osd_recovery_max_active`) — https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook Ceph Toolbox deployment and volume mounts — https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Rook toolbox.yaml source — https://github.com/rook/rook/blob/master/deploy/examples/toolbox.yaml

## Issues Found

### 1. Malformed Pool Inventory Table
**What was wrong:** The markdown table header had 7 columns (Pool Name, Type, Size, Device Class, Compression, PGs, Used For) but every data row only had 6 columns. The "Size" column had no corresponding data in any row, making the table render incorrectly.
**What was changed:** Removed the "Size" column from the header and separator row. The replication factor is already captured in the "Type" column (e.g., "Replicated 3x", "EC 6+2"), so a separate "Size" column was redundant and empty.

### 2. CronJob Missing Volume Mounts and Ceph Configuration
**What was wrong:** The CronJob YAML ran `ceph config dump` and `ceph osd pool ls detail` but did not mount the Ceph monitor endpoint ConfigMap (`rook-ceph-mon-endpoints`), the admin keyring Secret (`rook-ceph-mon`), or a volume for snapshot output. Without these, the `ceph` CLI cannot discover monitors or authenticate, and the commands would fail with connection errors. The `/snapshots` path also had no backing volume.
**What was changed:** Added volume mounts matching the Rook toolbox pattern: an emptyDir for `/etc/ceph`, the `rook-ceph-mon-endpoints` ConfigMap at `/etc/rook`, the `rook-ceph-mon` Secret at `/var/lib/rook-ceph-mon` (read-only), and a PVC for `/snapshots`. Added an inline init script that generates `ceph.conf` and copies the keyring before running the snapshot commands.

## Review Notes
- The `osd_recovery_max_active` config option still works but in modern Ceph (Nautilus+) there are per-device-class variants: `osd_recovery_max_active_hdd` (default 3) and `osd_recovery_max_active_ssd` (default 10). The blog's example of setting the global option to 3 is valid but readers should be aware of the per-device-class defaults.
- The CRUSH map export commands (`getcrushmap -o` and `crushtool -d`) write output files inside the container. Readers would need `kubectl cp` to retrieve those files from the toolbox pod, unlike the first two export commands which redirect stdout to the local machine. This is not technically wrong but could be clarified in a future revision.
- All Ceph CLI commands (`ceph config dump`, `ceph osd pool ls detail`, `ceph osd getcrushmap`), config option names (`bluestore_cache_size_ssd`, `rgw_max_chunk_size`, `osd_recovery_max_active`), and version information (Ceph v19.2.0 = Squid) are verified correct.
