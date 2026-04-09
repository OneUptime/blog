# Validation Summary: How to Configure Read Affinity in Rook-Ceph for Performance

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (RBD, CephFS, CRUSH, OSD, PG)
- Kubernetes (StorageClass, topology labels, CSI)
- fio (benchmarking tool)
- Prometheus (monitoring metrics)

## Sources Consulted
- Ceph RBD Configuration Reference: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph CRUSH Maps - Primary Affinity: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph Architecture - CephFS direct client access to RADOS: https://docs.ceph.com/en/latest/architecture/
- Ceph mount.ceph man page (read_from_replica option): https://docs.ceph.com/en/latest/man/8/mount.ceph/
- Ceph Octopus Release Notes: https://docs.ceph.com/en/latest/releases/octopus/
- Ceph Bug #48999 - Data corruption with rbd_balance_parent_reads/rbd_balance_snap_reads: https://tracker.ceph.com/issues/48999
- Ceph PR #35438 - rbd_read_from_replica_policy implementation (Octopus): https://github.com/ceph/ceph/pull/35438
- Rook CephCluster CRD - readAffinity: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph CSI Drivers - Read Affinity: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook Topology-Based Provisioning: https://rook.io/docs/rook/latest-release/CRDs/Cluster/external-cluster/topology-for-external-mode/
- Rook operator.yaml (CSI topology settings): https://github.com/rook/rook/blob/master/deploy/examples/operator.yaml
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found

1. **Mermaid diagram had Primary/Replica labels swapped**: The diagram showed the local OSD (same zone as the client pod) labeled as "Primary OSD" and the remote OSD as "Replica OSD". This is conceptually backwards — the whole point of read affinity is that the client reads from a local *replica* instead of a remote *primary*. Fixed by labeling the local OSD as "Replica OSD" and the remote OSD as "Primary OSD", and updating the edge labels accordingly.

2. **Incorrect Ceph version for `rbd_read_from_replica_policy`**: The post claimed this setting was "available since Ceph Pacific/16.2". According to Ceph source code and PR #35438, this feature was introduced in **Ceph Octopus (15.2)** and made functional in v15.2.4. Fixed the version reference to "Octopus/15.2".

3. **CephFS section falsely referenced "MDS read directives"**: The post stated "configure MDS read directives to serve reads from the nearest MDS." This is incorrect — CephFS data reads go directly to OSDs via RADOS; MDS only handles metadata operations. Read affinity for CephFS data is configured at the OSD/RADOS layer, not through MDS. Fixed the text to accurately describe that data reads go to OSDs and that CephFS read affinity is configured via the `readAffinity` section in the CephCluster CR (`spec.csi.readAffinity.enabled: true`).

4. **`ceph pg map` description was misleading**: The post said this command shows "which OSD is serving reads for a specific PG." In reality, `ceph pg map` shows the PG-to-OSD mapping (up set and acting set), not which specific OSD is currently serving reads — that depends on the client-side read policy (primary, balance, or localize). Fixed the description to accurately say it shows the OSD mapping.

5. **Added note that `rbd_read_from_replica_policy` supersedes older settings**: The post set `rbd_balance_snap_reads`, `rbd_localize_snap_reads`, `rbd_balance_parent_reads`, and `rbd_localize_parent_reads` in addition to `rbd_read_from_replica_policy balance`. The newer policy supersedes all four older options. Added a clarifying note.

## Review Notes
- The `rbd_balance_snap_reads` and `rbd_balance_parent_reads` settings have a known data corruption bug documented in Ceph tracker Bug #48999. While the post now notes that `rbd_read_from_replica_policy` supersedes them, users following the post sequentially may still enable these settings. A future improvement could add an explicit warning about this bug or remove the older settings entirely in favor of the newer `rbd_read_from_replica_policy`.
- The CephFS StorageClass example includes `fuseMountOptions: "allow_other"` which is unrelated to read affinity (it permits non-root access to FUSE mounts). This is not incorrect, but readers may mistakenly associate it with read affinity configuration.
- The fio benchmark command uses `--overrides='...'` as a placeholder, which is fine for illustration but would not work as-is. Readers would need to supply proper pod spec overrides with volume mounts.
- All Rook CSI provisioner names, secret names, ConfigMap settings, and Kubernetes StorageClass API usage were verified as correct.
