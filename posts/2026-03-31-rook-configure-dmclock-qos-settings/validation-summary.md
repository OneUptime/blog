# Validation Summary: How to Configure DmClock QoS Settings in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (mClock / DmClock QoS scheduler)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands, CRDs)
- BlueStore (Ceph OSD backend)

## Sources Consulted
- Ceph Quincy release notes — https://docs.ceph.com/en/latest/releases/quincy/
- Ceph mClock config reference — https://docs.ceph.com/en/quincy/rados/configuration/mclock-config-ref/
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph configuration guide — https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-configuration/
- Red Hat Ceph Storage 6 mClock documentation — https://docs.redhat.com/en/documentation/red_hat_ceph_storage/6/html/administration_guide/the-mclock-osd-scheduler

## Issues Found
1. **Incorrect Ceph release for mClock default**: The post stated "The mClock scheduler is the default in Ceph Pacific and later." This is incorrect. The mClock scheduler (`mclock_scheduler`) became the default `osd_op_queue` in **Ceph Quincy (v17.2.x)**, not Pacific (v16.2.x). In Pacific, the default was still WPQ and mClock had to be explicitly enabled. Additionally, mClock is only supported for BlueStore OSDs. Changed to "The mClock scheduler is the default in Ceph Quincy and later (for BlueStore OSDs)."

## Review Notes
- The three mClock profiles (`balanced`, `high_client_ops`, `high_recovery_ops`) and the `custom` profile are all correctly named.
- The custom config keys (`osd_mclock_scheduler_client_res`, `osd_mclock_scheduler_client_wgt`, `osd_mclock_scheduler_client_lim`) are correct. Note these can only be modified when the profile is set to `custom`; the post correctly shows setting the profile to `custom` first.
- The Rook CephCluster CR structure using `spec.cephConfig` with daemon-type sections (`osd:`) is correct per current Rook documentation.
- All kubectl commands use the correct `rook-ceph-tools` deployment for toolbox access.
