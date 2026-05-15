# Validation Summary: How to Backup and Restore LVM Snapshots on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- LVM and LVM snapshots
- XFS filesystem snapshot mounting
- Bash shell scripting
- tar backups

## Sources Consulted
- Red Hat Enterprise Linux 8 System Design Guide: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/system_design_guide/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 7 Logical Volume Manager Administration: Logical Volume Administration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/logical_volume_manager_administration/lv
- Red Hat Enterprise Linux 7 Storage Administration Guide: Suspending an XFS File System: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/xfsfreeze
- Red Hat Enterprise Linux 9 Configuring and Managing Logical Volumes: Managing system upgrades with snapshots: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/managing-system-upgrades-with-snapshots_configuring-and-managing-logical-volumes

## Issues Found
- The snapshot mount commands used only `-o ro`. On RHEL systems using XFS, mounting an LVM snapshot while the origin filesystem is mounted requires the `nouuid` mount option because the snapshot has the same filesystem UUID as the origin. Updated both mount examples to use `-o ro,nouuid` and added a short comment.
- The post stated that a 5 GB snapshot is usually enough for short-term operations. Snapshot space requirements depend on write activity while the snapshot exists, and a full snapshot becomes invalid. Updated the wording to tell readers to size for expected writes and monitor usage.
- The introduction implied snapshots provide generally consistent backups. LVM snapshots can provide filesystem-consistent point-in-time copies, but application-consistent backups require quiescing or application-specific backup tooling. Updated the wording to make that distinction.

## Review Notes
The LVM commands and options used in the post (`vgs`, `lvs`, `lvcreate --snapshot --size --name`, `lvconvert --merge`, and `lvremove`) match Red Hat documentation. Red Hat documents that merging a root filesystem snapshot is deferred until the origin is activated, so the reboot guidance is appropriate for the root volume.
