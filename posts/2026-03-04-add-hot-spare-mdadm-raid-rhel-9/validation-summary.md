# Validation Summary: How to Add a Hot Spare Disk to an mdadm RAID Array on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Software RAID
- mdadm
- mdadm.conf
- dracut

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 18 Managing RAID: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- mdadm(8) Linux manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- mdadm.conf(5) Linux manual page: https://man7.org/linux/man-pages/man5/mdadm.conf.5.html
- dracut(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/dracut.8.html

## Issues Found
- The shared-spare example used `--spare-group=shared` with `mdadm --create`. The current mdadm documentation describes spare groups as `spare-group=` attributes on `ARRAY` lines in `mdadm.conf`, and monitor mode moves spares between arrays in the same group. I changed the example to create the arrays normally, add `spare-group=shared` to their `ARRAY` entries in `/etc/mdadm.conf`, and then add the spare to one array in that group.

## Review Notes
- The core commands for adding a spare, checking `/proc/mdstat`, failing and removing a member, updating `/etc/mdadm.conf`, and regenerating initramfs are consistent with the consulted RHEL and mdadm documentation.
- The examples use whole disks such as `/dev/sde`. In production, using partitions with appropriate alignment and consistent partition tables is often preferable, but the whole-disk examples are valid for mdadm and were not technically incorrect.
