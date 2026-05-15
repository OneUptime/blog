# Validation Summary: How to Resize an iSCSI LUN and Extend the File System on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- iSCSI
- Linux-IO target and targetcli
- Open-iSCSI iscsiadm
- Linux SCSI sysfs rescans
- DM-Multipath
- LVM
- XFS
- ext4
- growpart

## Sources Consulted
- Red Hat Enterprise Linux 9, Managing storage devices, "Configuring an iSCSI target": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-target_managing-storage-devices
- Red Hat Enterprise Linux 9, Managing file systems, "Increasing the size of an XFS file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems
- Red Hat Enterprise Linux 9, Managing file systems, "Resizing an ext4 file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 8, Configuring device mapper multipath, "Managing multipathed volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_device_mapper_multipath/managing-multipathed-volumes_configuring-device-mapper-multipath
- Red Hat Enterprise Linux 6 Storage Administration Guide, "Scanning iSCSI Targets with Multiple LUNs or Portals": https://docs.redhat.com/it/documentation/red_hat_enterprise_linux/6/html/storage_administration_guide/iscsi-scanning-interconnects
- Open-iSCSI upstream iscsiadm usage documentation: https://github.com/open-iscsi/open-iscsi
- Linux kernel SCSI sysfs documentation: https://docs.kernel.org/scsi/index.html
- Local command help output for `resize2fs` and `growpart`.

## Issues Found
- The fileio section said to "resize in targetcli", but the shown operation only inspected the targetcli storage object and extended the backing file with `truncate`. Updated the wording to say targetcli is used to inspect the current size and added a note to verify the new size or recreate the backstore if it is not reflected.
- The SCSI host rescan example used `echo 1 > /sys/class/scsi_host/host3/scan`. Host scans take a channel/target/LUN tuple, commonly `- - -` to scan all IDs. Updated the example to `echo "- - -" | sudo tee /sys/class/scsi_host/host3/scan`. The specific device rescan using `echo 1 > .../device/rescan` was left unchanged.

## Review Notes
- The core workflow is correct: expand the target-side storage, rescan the iSCSI/SCSI device on the initiator, then grow the filesystem or LVM stack.
- XFS guidance is correct for RHEL 9: XFS can be grown while mounted with `xfs_growfs`, and shrinking XFS is not supported.
- ext4 guidance is correct for growth: `resize2fs` can grow mounted ext4 filesystems, and `growpart` is appropriate when the filesystem sits on a partition.
- Multipath resizing with `multipathd resize map <map>` matches Red Hat DM-Multipath documentation.
