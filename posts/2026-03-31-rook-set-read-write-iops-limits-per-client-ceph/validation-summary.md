# Validation Summary: How to Set Read and Write IOPS Limits Per Client in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RBD, mClock scheduler)
- Rook-Ceph CSI
- Kubernetes StorageClass
- fio (Flexible I/O Tester)

## Sources Consulted
- Ceph official documentation on RBD QoS: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph RBD CLI reference: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph mClock scheduler documentation: https://docs.ceph.com/en/latest/rados/configuration/mclock-config-ref/
- Rook-Ceph CSI StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph CSI driver parameters: https://github.com/ceph/ceph-csi

## Issues Found

1. **StorageClass `mapOptions` for QoS (was line 69)**: The post used `mapOptions: "qos_read_iops_limit=1000,qos_write_iops_limit=500"` in the StorageClass. The `mapOptions` field passes flags to the `rbd map` command and does not support QoS parameters. RBD QoS must be configured at the image or pool config level. **Fix**: Replaced with `rbd config pool set` commands to set pool-level QoS defaults, and removed the invalid `mapOptions` entry from the StorageClass YAML.

2. **CephFS section mislabeled (was lines 84-92)**: The section was titled "Applying Limits to CephFS Clients" and described using `rbd_qos_*` settings for CephFS workloads. These settings are RBD-specific and have no effect on CephFS I/O. **Fix**: Renamed the section to "Setting Global RBD Client Defaults" and clarified that these settings apply only to RBD, not CephFS.

3. **Bandwidth unit labels (lines 26-28)**: Comments said "500MB/s", "200MB/s", and "600MB/s" but the byte values (524288000, 209715200, 629145600) are calculated using binary units (MiB = 1024*1024). **Fix**: Changed comments to "500MiB/s", "200MiB/s", and "600MiB/s" to accurately reflect the values.

## Review Notes
- CephFS does not currently have built-in per-client IOPS QoS equivalent to RBD's `rbd_qos_*` settings. If CephFS QoS is needed, external mechanisms such as cgroups or client-side rate limiting would be required. The post now correctly avoids making this claim.
- The mClock `osd_mclock_scheduler_client_lim` parameter is accurately described as not differentiating between read and write operations. The value represents an IOPS limit at the OSD scheduler level.
- The fio verification commands are correct and use appropriate flags for testing random read/write IOPS on block devices.
