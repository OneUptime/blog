# Validation Summary: How to Configure Ceph QoS and Throttling in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RBD QoS, mClock scheduler, OSD recovery throttling)
- Rook (CephCluster CRD, CSI provisioner, toolbox)
- Kubernetes (StorageClass, PersistentVolume, kubectl)
- Ceph CSI driver (rbd provisioner)

## Sources Consulted
- Ceph RBD Config Reference (QoS Settings): https://docs.ceph.com/en/latest/rbd/rbd-config-ref/#qos-settings
- Ceph mClock Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mclock-config-ref/
- Ceph OSD Config Reference: https://docs.ceph.com/en/quincy/rados/configuration/osd-config-ref/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph Configuration documentation: https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Red Hat Ceph Storage 6 - mClock OSD Scheduler: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/6/html/administration_guide/the-mclock-osd-scheduler

## Issues Found

1. **Inaccurate QoS mechanism description (line 13)**: The post described Ceph QoS as using "RBD namespace throttling", which is not a real term. Changed to accurately describe the two mechanisms: librbd QoS configuration options (client-side) and the mClock scheduler (OSD-side).

2. **Misleading StorageClass QoS claim (line 87)**: The post claimed QoS parameters could be set via `csi.storage.k8s.io/fstype` and custom StorageClass parameters. Ceph CSI does not support setting RBD QoS parameters through StorageClass fields. Corrected to explain that QoS must be applied manually to RBD images after provisioning.

3. **Duplicate YAML key in StorageClass (lines 99, 106)**: `imageFeatures: layering` appeared twice in the StorageClass YAML, which is invalid YAML (duplicate keys). Removed the duplicate.

4. **Incorrect description of `osd_recovery_op_priority` (line 129)**: The post described this as "Limit recovery operations per OSD", but this setting controls the priority/weight of recovery operations (range 1-63), not the count. Corrected the description.

5. **CephCluster CR section key format (line 155)**: The `cephConfig` field used `osd:` as the section key, but Rook's CephCluster CRD requires the Ceph target entity format `"osd.*":` (with wildcard and quotes). Fixed to use the correct format.

6. **mClock described as just "available" (line 145)**: mClock is the default OSD scheduler in Quincy+ for BlueStore OSDs, not merely "available". Corrected to state it is the default.

7. **Misleading `ceph -w` description (line 183)**: The post said "Check Prometheus metrics for I/O rates" but `ceph -w` is a Ceph CLI watch command that shows real-time cluster activity, not a Prometheus metrics check. Corrected the description.

## Review Notes
- All RBD QoS config option names (`rbd_qos_iops_limit`, `rbd_qos_read_iops_limit`, `rbd_qos_write_iops_limit`, `rbd_qos_bps_limit`, `rbd_qos_iops_burst`, `rbd_qos_iops_burst_seconds`) are verified correct per official Ceph documentation.
- The `rbd config image set`, `rbd config image get`, and `rbd config pool set` command syntax is correct.
- RBD QoS is enforced client-side by librbd — the same image used by multiple clients will have independent throttle limits per client process.
- The `osd_recovery_op_priority` setting is primarily relevant to the WPQ scheduler. With mClock (default in Quincy+), the mClock profiles handle QoS prioritization instead. The post could note this distinction in a future update.
- The mClock profiles (`balanced`, `high_client_ops`, `high_recovery_ops`) are all verified correct. A fourth profile (`custom`) also exists but is not mentioned, which is fine for this tutorial scope.
