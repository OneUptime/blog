# Validation Summary: How to Set Up RAID Storage Using the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit web console
- cockpit-storaged
- Linux mdraid and mdadm
- XFS and ext4 file systems
- systemd services
- dracut/initramfs

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 18 "Managing RAID": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_storage_devices/index
- Red Hat Enterprise Linux 9 Managing systems using the RHEL 9 web console, "Installing and enabling the web console": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/getting-started-with-the-rhel-9-web-console_system-management-using-the-rhel-9-web-console
- Linux mdadm(8) manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- Linux mdadm.conf(5) manual page: https://man7.org/linux/man-pages/man5/mdadm.conf.5.html
- Local util-linux command help for blkid and lsblk.

## Issues Found
- The prerequisites installed only `mdadm`, but Red Hat's Cockpit RAID workflow requires the RHEL web console to be installed and enabled and the `cockpit-storaged` package to be present. Updated the install command to include `cockpit` and `cockpit-storaged`, and added `systemctl enable --now cockpit.socket`.
- The mdadm alert example overwrote `/etc/mdadm.conf` and replaced any existing `ARRAY` entries with only `MAILADDR` and `PROGRAM`. Red Hat documents `ARRAY` and `MAILADDR` as mandatory for monitoring, and `mdadm.conf(5)` defines `PROGRAM` as an optional external event handler, not the mdadm binary itself. Updated the example to add `MAILADDR` only if it is missing, preserving the array definitions saved earlier in the post.

## Review Notes
- The mdadm commands use whole disk paths such as `/dev/sdb`; mdadm supports block devices, while Red Hat's installed-system examples use partitions such as `/dev/sda1`. For production systems, using partitions or persistent `/dev/disk/by-*` paths can make device identity clearer and reduce mistakes if kernel device names change.
- The post's direct `mkfs.xfs /dev/md0` CLI example is valid when using the array as a whole device. If the Cockpit partition-table workflow is followed, the filesystem would instead be created on the resulting RAID partition, such as `/dev/md0p1`.
