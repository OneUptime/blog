# Validation Summary: How to Set Up Immutable Files with chattr on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- chattr / lsattr (e2fsprogs)
- ext2/ext3/ext4, XFS, Btrfs filesystem attributes
- logrotate (prerotate/postrotate hooks)
- rsyslog
- Linux audit subsystem (auditctl, ausearch)
- AIDE (file integrity monitoring)
- Ubuntu system administration

## Sources Consulted
- chattr(1) man page (e2fsprogs) — https://man7.org/linux/man-pages/man1/chattr.1.html
- lsattr(1) man page — https://man7.org/linux/man-pages/man1/lsattr.1.html
- Linux kernel headers `<linux/fs.h>` for FS_IOC_SETFLAGS / FS_IOC_GETFLAGS definitions
- ioctl(2) macro definitions in `<asm-generic/ioctl.h>` (_IOC_DIRSHIFT, _IOC_SIZESHIFT, etc.)
- logrotate(8) man page — https://man7.org/linux/man-pages/man8/logrotate.8.html
- Ubuntu rsyslog package — verified `/usr/lib/rsyslog/rsyslog-rotate` path and default `/etc/logrotate.d/rsyslog` template
- auditctl(8) man page — https://man7.org/linux/man-pages/man8/auditctl.8.html
- AIDE documentation (Debian/Ubuntu `aideinit` wrapper)

## Issues Found
- **Incorrect ioctl code for `FS_IOC_SETFLAGS`**: The post claimed `0x40086601` was the ioctl code for `FS_IOC_SETFLAGS`. This is wrong — `FS_IOC_SETFLAGS` is defined as `_IOW('f', 2, long)`, which on x86_64 (where `long` is 8 bytes) evaluates to `0x40086602`. The value `0x40086601` doesn't correspond to a standard FS ioctl (the closest, `FS_IOC_GETFLAGS = _IOR('f', 1, long)`, is `0x80086601` — different direction bit). I updated both the `auditctl` command argument and the accompanying comment to use `0x40086602`, and clarified the comment notes this is the x86_64 value.

## Review Notes
- The `u` (undeletable) and `s` (secure deletion) attributes are documented in chattr(1) as described, but the chattr man page's BUGS section notes these attributes are **not honored** by ext2/ext3/ext4 in current mainline Linux kernels. The post's descriptions match the man page documentation, so they are not technically incorrect, but readers should be aware these attributes do not currently do anything on common Linux filesystems.
- The `apply-immutable-hardening` script uses `set -euo pipefail` and a bare line `chattr +i /etc/ssh/ssh_host_*_key.pub 2>/dev/null` (without `|| true` or `&& echo ...`). If the glob fails to match or chattr errors, the script will exit early. In practice this works on a standard Ubuntu SSH server where the host key files always exist, so it's not a hard error, but the script is brittle if a host lacks SSH host keys.
- The `lsattr` output position description (`i` at position 5, `e` at position 15 in the `----i---------e----` format) matches the flag print order used by current e2fsprogs.
- `/usr/lib/rsyslog/rsyslog-rotate` is the correct path on Ubuntu — verified against the default `/etc/logrotate.d/rsyslog` configuration shipped by the rsyslog package.
- The post correctly notes that `chattr` does not work on NFS and many non-Linux-native filesystems, and that physical access or a root attacker can bypass it. These caveats are accurate.
