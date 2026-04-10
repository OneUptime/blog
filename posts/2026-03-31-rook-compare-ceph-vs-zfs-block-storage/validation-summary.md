# Validation Summary: How to Compare Ceph vs ZFS for Block Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- ZFS / OpenZFS
- Rook (Ceph Kubernetes operator)
- OpenEBS ZFS-LocalPV
- Kubernetes StorageClass / CSI

## Sources Consulted
- OpenZFS documentation: checksum property defaults to `on` which uses fletcher4 (https://openzfs.github.io/openzfs-docs/man/v2.3/7/zfsprops.7.html)
- Ceph documentation: BlueStore checksumming uses CRC32C (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph documentation: deduplication is experimental, not removed (https://docs.ceph.com/en/latest/rados/operations/pool-dedup/)
- Rook documentation: StorageClass provisioner and parameters (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- OpenEBS ZFS-LocalPV documentation: CSI provisioner name and parameters (https://github.com/openebs/zfs-localpv)
- ZFS command reference: zpool create, zfs create syntax
- Ceph command reference: rbd create, rbd map, ceph osd pool scrub syntax

## Issues Found

1. **ZFS default checksum algorithm was incorrect**: The post stated "ZFS uses SHA-256 by default." This is wrong. ZFS/OpenZFS defaults to `fletcher4` when the checksum property is set to `on` (the default). SHA-256 is available as an option but is not the default. Changed to "ZFS uses fletcher4 by default."

2. **Ceph metadata checksum algorithm was incorrect**: The post stated "Ceph uses CRC32C for data and SHA-256 for metadata." Ceph's BlueStore uses CRC32C for both data and metadata block checksums. SHA-256 is not specifically used for metadata checksumming in BlueStore. Changed to "Ceph uses CRC32C for data and metadata checksums."

3. **Ceph deduplication status was inaccurate**: The performance comparison table listed Ceph deduplication as "No (removed)." Ceph deduplication was never a production feature that was subsequently removed. It has been available as an experimental feature since the Nautilus release. Changed from "No (removed)" to "Experimental."

## Review Notes
- The Rook StorageClass example is simplified and omits some commonly required parameters (imageFormat, imageFeatures, CSI secret references). This is acceptable for a comparison blog post but readers implementing this will need to consult the full Rook documentation.
- The RAIDZ2 example correctly uses 6 disks (4 data + 2 parity), matching the RAID-6 analogy.
- The `rbd create` and `rbd map` command syntax is correct.
- The `ceph osd pool scrub` and `zpool scrub` commands are correct.
- The OpenEBS ZFS-LocalPV StorageClass example uses the correct provisioner name and parameter format.
