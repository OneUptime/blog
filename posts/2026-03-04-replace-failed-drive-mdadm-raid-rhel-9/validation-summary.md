# Validation Summary: How to Replace a Failed Drive in an mdadm RAID Array on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux mdraid
- mdadm
- smartctl
- lsblk
- wipefs
- dracut
- Linux RAID rebuild tuning via sysctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing RAID": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- mdadm(8) manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- wipefs(8) manual page: https://man7.org/linux/man-pages/man8/wipefs.8.html
- dracut(8) manual page: https://man7.org/linux/man-pages/man8/dracut.8.html
- lsblk(8) manual page: https://man7.org/linux/man-pages/man8/lsblk.8.html
- Linux kernel md RAID documentation: https://docs.kernel.org/admin-guide/md.html

## Issues Found
- The original replacement examples reused `/dev/sdc` for both the failed member and the replacement disk. Linux device names can change after replacing hardware, and Red Hat's documented replacement flow uses the failed disk path and the new disk path separately. I changed the replacement disk examples to `/dev/sdf` and clarified that readers should note the actual array member path, such as `/dev/sdc` or `/dev/sdc1`.
- The SCSI rescan example scanned only `/sys/class/scsi_host/host0/scan`, which can miss disks attached through other SCSI hosts. I changed it to loop over `/sys/class/scsi_host/host*/scan`.
- The non-hot-swap guidance implied SCSI rescan could be an alternative to shutting down. I clarified that non-hot-swap systems need shutdown for the physical replacement, while rescanning is for post-boot detection or hot-plug systems that did not detect the disk automatically.
- The SMART health check in Common Pitfalls referenced the failed disk name after the replacement examples had switched to `/dev/sdf`. I updated it to check the replacement disk.

## Review Notes
- The post assumes the array uses whole-disk members. If an environment uses partition members, the same mdadm operations should target the partition path, such as `/dev/sdf1`, after recreating a suitable partition layout on the replacement disk.
- Local `mdadm` and `dracut` binaries were not installed in the review environment, so those commands were verified against Red Hat documentation and upstream manual pages instead of local `--help` output.
