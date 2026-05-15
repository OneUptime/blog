# Validation Summary: How to Build a RAID 10 Array with mdadm on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux mdraid
- mdadm
- RAID 10
- XFS
- dracut
- /etc/fstab

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, "Managing RAID": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- mdadm(8) Linux manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- md(4) Linux manual page: https://man7.org/linux/man-pages/man4/md.4.html
- Red Hat Enterprise Linux 9 Security hardening documentation for `dracut -f --regenerate-all` usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/security_hardening/

## Issues Found
- The prerequisites and scaling section stated that RAID 10 always requires an even number of disks. This is true for a conventional mirrored-pair RAID 10 layout, but mdadm's native RAID10 implementation supports layouts such as `n2` that do not strictly require an even device count. Updated the wording to keep the four-disk conventional example while avoiding the incorrect absolute claim.

## Review Notes
- The mdadm create, detail, fail, remove, and add commands align with documented mdadm usage and Red Hat's RHEL 9 storage documentation.
- The post uses whole disks rather than partitions. mdadm can use block devices directly, but Red Hat's examples commonly use partitions such as `/dev/sda1`; using stable `/dev/disk/by-id/` paths would be a good future improvement for production systems.
