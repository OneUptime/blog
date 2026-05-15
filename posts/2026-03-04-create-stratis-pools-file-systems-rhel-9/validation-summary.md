# Validation Summary: How to Create Stratis Pools and File Systems on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Stratis
- stratisd
- stratis-cli
- XFS
- systemd and `/etc/fstab`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up Stratis file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 10 documentation, "Setting up Stratis file systems" for current Stratis CLI behavior and boot-mount guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_file_systems/setting-up-stratis-file-systems
- Stratis upstream how-to/walk-through: https://stratis-storage.github.io/howto/
- stratis-cli man page reference: https://www.mankier.com/8/stratis
- Red Hat Enterprise Linux 9 release notes, Technology Previews: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.2_release_notes/technology-previews

## Issues Found
- The multi-device pool section claimed that Stratis stripes data across all pool devices for improved performance. Red Hat documents Stratis pools as being composed of one or more block devices and supports MD RAID as an underlying device type, but Stratis pool creation is not a RAID striping command. I changed the explanation to say the devices are added as shared pool capacity and noted that RAID-style behavior should be provided below Stratis if needed.
- The `stratis pool describe datapool` command is not present in the current stratis-cli command reference. I changed it to `stratis pool list --name datapool`, which Red Hat documents for detailed pool information by name.
- The persistent mount example used filesystem UUID entries with `x-systemd.requires=stratisd.service`. Red Hat's RHEL 9 Stratis documentation uses `/dev/stratis/<pool>/<filesystem>` with `x-systemd.requires=stratis-fstab-setup@<pool-uuid>.service` and `x-systemd.after=stratis-fstab-setup@<pool-uuid>.service`. I updated the command and fstab examples accordingly.
- The pool-full warning stated that all filesystems become read-only. Red Hat documents that when a full pool has no allocatable space, no additional space can be assigned and applications risk data loss. I changed the wording to "writes can fail, and applications can lose data."
- The size-limit example used only `--size-limit`. Red Hat documents creating a size-limited filesystem as `stratis filesystem create --size number-and-unit --size-limit number-and-unit my-pool my-fs`, with `--size-limit` available starting in Stratis 3.6.0. I updated the example to include `--size 10GiB --size-limit 10GiB` and adjusted the explanation.
- The best-practice recommendation to always use UUIDs in fstab conflicted with the official Stratis boot-mount pattern. I replaced it with guidance to use the Stratis fstab setup service.

## Review Notes
The remaining pool, filesystem, block device listing, mount, rename, thin provisioning, and package installation examples match the cited RHEL and Stratis documentation. Size limits require Stratis 3.6.0 or later, which is documented by Red Hat.
