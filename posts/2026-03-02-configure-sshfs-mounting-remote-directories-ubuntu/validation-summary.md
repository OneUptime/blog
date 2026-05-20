# Validation Summary: How to Configure SSHFS for Mounting Remote Directories on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- SSHFS
- SSH / OpenSSH client configuration
- FUSE / libfuse
- `/etc/fstab`
- systemd mount units

## Sources Consulted
- Ubuntu SSHFS manual page: https://manpages.ubuntu.com/manpages/noble/man1/sshfs.1.html
- Upstream SSHFS manual page: https://man7.org/linux/man-pages/man1/sshfs.1.html
- libfuse FAQ for fstab and `allow_other`: https://github.com/libfuse/libfuse/wiki/FAQ
- Ubuntu `mount.fuse3` manual page for FUSE cache options: https://manpages.ubuntu.com/manpages/lunar/man8/mount.fuse3.8.html
- systemd mount unit documentation: https://www.freedesktop.org/software/systemd/man/256/systemd.mount.html
- systemd unit escaping documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- Local Ubuntu/Linux manual pages: `fusermount3(1)`, `fstab(5)`, `ssh_config(5)`

## Issues Found
- The unmount examples used `fusermount`. Current Ubuntu SSHFS documentation for SSHFS 3.x uses `fusermount3` on Linux, so the examples were updated to `fusermount3`.
- The systemd mount unit filename example for `/home/user/mnt/remote-server` was not shell-safe. A hyphen inside a path component is escaped as `\x2d` in the unit name, and an unquoted backslash would be consumed by the shell. The example now uses `systemd-escape` and quotes the escaped unit filename and `systemctl` arguments.
- The performance examples used older SSHFS cache options (`cache=yes`, `cache_timeout`) that are not the current SSHFS 3.x option names on supported Ubuntu releases. They were updated to `dir_cache=yes` and `dcache_timeout`, while keeping valid FUSE options such as `attr_timeout` and `max_read`.

## Review Notes
The post is technically relevant and accurate after the corrections. `fuse.sshfs` remains acceptable in fstab examples for compatibility, although current SSHFS documentation also allows using `sshfs` as the filesystem type.
