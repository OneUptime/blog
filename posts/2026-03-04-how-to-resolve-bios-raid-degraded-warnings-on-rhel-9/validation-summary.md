# Validation Summary: How to Resolve 'BIOS RAID Degraded' Warnings on RHEL 9

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux mdraid
- mdadm
- firmware/BIOS RAID metadata
- smartmontools smartctl
- util-linux sfdisk
- systemd mdmonitor service

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 18 Managing RAID: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/index
- mdadm(8) Linux manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- mdadm.conf(5) Linux manual page: https://man7.org/linux/man-pages/man5/mdadm.conf.5.html
- sfdisk(8) Linux manual page: https://man7.org/linux/man-pages/man8/sfdisk.8.html
- smartmontools smartctl usage documentation: https://www.smartmontools.org/static/doxygen/smartctl_8cpp_source.html

## Issues Found
- The failed-disk replacement sequence removed the member without first marking it faulty. Red Hat's RHEL 9 RAID replacement procedure marks the failed member with `mdadm --fail` before `mdadm --remove`, so the post now includes that command.
- The BIOS RAID check used `dmraid`. RHEL 9 documents `mdraid` with external metadata, managed by `mdadm`, for Intel IMSM/ISW and SNIA DDF firmware RAID sets. The post now checks RAID metadata with `mdadm --detail` and `mdadm --examine`.
- The email alert configuration overwrote `/etc/mdadm.conf` with only `MAILADDR`. Red Hat documents `ARRAY` and `MAILADDR` as mandatory variables for monitoring, so the post now appends `mdadm --detail --scan` output before adding `MAILADDR`.
- The alert test used `mdadm --monitor --test /dev/md0`, which does not exercise the system-wide configured monitor path. The post now uses `mdadm --monitor --scan --test --oneshot`, matching mdadm monitor mode semantics for scanning configured arrays.

## Review Notes
- The `sfdisk -d /dev/sda | sudo sfdisk /dev/sdc` pattern is syntactically valid, but `sfdisk` documentation warns that restoring a dumped layout can duplicate partition UUIDs. In a production recovery guide, persistent names and UUID review would be worth adding.
