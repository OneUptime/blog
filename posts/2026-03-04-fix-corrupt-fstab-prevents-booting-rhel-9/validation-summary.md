# Validation Summary: How to Fix a Corrupt /etc/fstab That Prevents Booting on RHEL

## Status
validated

## Post Type
Tutorial / recovery guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- `/etc/fstab`
- systemd emergency mode and mount units
- GRUB boot parameters
- RHEL installer rescue mode
- NFS mounts
- util-linux commands: `mount`, `findmnt`, `blkid`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systemd, emergency mode and `systemd.unit=emergency.target`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Using rescue mode and `/mnt/sysroot`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/troubleshooting-after-installation_rhel-installer
- systemd.mount manual: `_netdev`, `nofail`, and `x-systemd.device-timeout=` behavior: https://www.freedesktop.org/software/systemd/man/systemd.mount.html
- Linux `fstab(5)` manual from util-linux: field format, comments, UUID syntax, and `nofail`: https://man7.org/linux/man-pages/man5/fstab.5.html
- Linux `findmnt(8)` manual from util-linux: `--verify` option: https://man7.org/linux/man-pages/man8/findmnt.8.html
- Red Hat Enterprise Linux 9 documentation: NFS mount options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/frequently-used-nfs-mount-options_mounting-nfs-shares

## Issues Found
- The rescue-mode example used `/mnt/sysimage/etc/fstab`. RHEL 9 documentation says the target system root is mounted at `/mnt/sysroot`, while `/mnt/sysimage` is also supported for the physical root. Changed the example to edit `/mnt/sysroot/etc/fstab`.
- The "comment out the offending line" example placed `# DISABLED` at the end of the fstab entry, which would leave the entry active because `#` only starts a comment from that point onward. Changed the example so the whole fstab entry is prefixed with `#`.
- The `_netdev` explanation said it makes systemd wait for the network. systemd documentation describes `_netdev` as marking the mount as network-dependent, which then affects dependency ordering. Updated the wording to match that behavior.
- The syntax section said every fstab line needs exactly six fields and cited extra spaces as a syntax problem. The `fstab(5)` manual states fields are separated by spaces or tabs, and the fifth and sixth fields default to zero if absent. Updated the wording to recommend six fields and identify unescaped spaces in mount points as the actual risk.

## Review Notes
The remaining commands and snippets are technically valid for RHEL 9. `mount -a` and `findmnt --verify` are useful checks, but they are not a perfect simulation of every boot-time condition, especially for entries already mounted, `nofail`, `noauto`, or network timing behavior.
