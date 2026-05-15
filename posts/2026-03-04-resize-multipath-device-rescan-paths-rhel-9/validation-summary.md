# Validation Summary: How to Resize a Multipath Device and Rescan Paths on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DM-Multipath and multipathd
- SCSI path rescanning through sysfs
- iSCSI session rescanning with iscsiadm
- XFS and ext4 file system growth
- LVM physical and logical volume resizing
- Partition growth with growpart

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring device mapper multipath, "Resizing an online multipath device": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_device_mapper_multipath/managing-multipathed-volumes_configuring-device-mapper-multipath
- Red Hat Enterprise Linux 9: Configuring device mapper multipath, "Administering the multipathd daemon": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_device_mapper_multipath/managing-multipathed-volumes_configuring-device-mapper-multipath
- multipathd(8) man page, command syntax and path format wildcards: https://manpages.debian.org/trixie/multipath-tools/multipathd.8.en.html
- multipath(8) man page, map flush options: https://manpages.ubuntu.com/manpages/jammy/man8/multipath.8.html
- iscsiadm(8) man page, session rescan option: https://www.mankier.com/8/iscsiadm
- Red Hat Enterprise Linux 9: Managing file systems, growing XFS with xfs_growfs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9: Configuring and managing logical volumes, extending logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Local command help for growpart and resize2fs.

## Issues Found
- The automated script used `multipathd show paths format "%d %m" | grep "$MPATH_DEV"`, which parses aligned human output and can match the wrong map name by substring. Changed it to `multipathd show paths raw format "%d %m" | awk -v map="$MPATH_DEV" '$2 == map {print $1}'` so scripts consume raw output and match the map name exactly.
- The troubleshooting section used `multipath -F` while describing a forced rediscovery of the affected device. `-F` flushes all unused multipath maps, which is broader than intended. Changed it to `multipath -f mpatha`, which targets the affected unused map.
- The conclusion said the process "does not require downtime" without qualification. Changed it to say that supported online resize paths can be done without downtime, which better matches Red Hat's online resize documentation while avoiding an overbroad guarantee for every stack.

## Review Notes
The main procedure is technically aligned with RHEL 9 DM-Multipath guidance: expand the backing LUN, rescan each SCSI path, run `multipathd resize map`, and then grow the layer above the multipath device. Future improvements could add examples for ext4 on partitioned multipath devices and recommend `lvextend --resizefs` as an optional single-step LVM workflow, but the current commands are valid.
