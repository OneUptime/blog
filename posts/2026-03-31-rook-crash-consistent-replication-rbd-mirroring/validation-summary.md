# Validation Summary: How to Achieve Crash-Consistent Replication with RBD Mirroring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Ceph RBD Mirroring (journal-based and snapshot-based)
- Rook Ceph Operator
- Kubernetes StorageClass (CSI provisioner)
- fsck (filesystem consistency check)

## Sources Consulted
- Ceph official documentation: RBD Mirroring (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph official documentation: RBD Configuration (https://docs.ceph.com/en/latest/rbd/rbd-config-ref/)
- Ceph official documentation: RBD Commands (https://docs.ceph.com/en/latest/man/8/rbd/)
- Rook documentation: Ceph Block Storage / StorageClass (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Kubernetes documentation: StorageClass API (https://kubernetes.io/docs/concepts/storage/storage-classes/)

## Issues Found
No technical issues found.

## Review Notes
- The `rbd_journal_order` example sets the value to 24, which is already the default. For a section titled "Configuring Journal Object Size" aimed at "large write workloads," a value like 25 (32MB) or 26 (64MB) would better illustrate the tuning intent. This is a pedagogical note, not a technical error.
- The `rbd mirror image status` JSON output embeds `entries_behind_master` inside the `description` string rather than as a standalone JSON field. Readers wanting to extract it programmatically would need to parse the description string (e.g., with `jq -r '.description' | grep -oP 'entries_behind_master":\K[0-9]+'`). The blog's approach is sufficient for a visual check.
- The post does not mention that the peer cluster must also be configured with `rbd mirror pool peer add` for mirroring to function. This is outside the stated scope (crash consistency) but readers setting up mirroring for the first time may need that additional step.
