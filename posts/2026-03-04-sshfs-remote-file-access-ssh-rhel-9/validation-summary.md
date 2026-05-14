# Validation Summary: How to Set Up SSHFS for Remote File Access Over SSH on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- SSHFS
- SSH and OpenSSH client options
- FUSE 3
- `/etc/fstab`
- systemd mount and automount units

## Sources Consulted
- Fedora Packages: `fuse-sshfs` package availability for Fedora EPEL 9: https://packages.fedoraproject.org/pkgs/fuse-sshfs/fuse-sshfs/
- Red Hat blog: EPEL setup on RHEL 9 and CodeReady Builder requirement: https://www.redhat.com/en/blog/whats-epel-and-how-do-i-use-it
- SSHFS upstream manual: https://raw.githubusercontent.com/libfuse/sshfs/master/sshfs.rst
- systemd.mount official manual: https://www.freedesktop.org/software/systemd/man/256/systemd.mount.html
- systemd.automount official manual: https://www.freedesktop.org/software/systemd/man/247/systemd.automount.html
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- Local FUSE 3 manuals: `mount.fuse(8)` and `fusermount3(1)`
- Local util-linux manual: `fstab(5)`

## Issues Found
- `fuse-sshfs` is not a base RHEL 9 package; it is provided by Fedora EPEL. Updated the installation block to enable CodeReady Builder and install the EPEL release package before installing `fuse-sshfs`.
- The unmount examples used `fusermount`, but SSHFS 3/FUSE 3 documentation uses `fusermount3` on Linux. Updated all unmount examples to `fusermount3`.
- The performance example used `max_read` and `max_write` as recommended buffer tuning. `max_read` is deprecated as a user-facing FUSE option, and `max_write` is not documented as an SSHFS/FUSE mount option in the checked manuals. Removed those options and kept documented SSH compression/cipher options.
- The troubleshooting cache example used `cache=yes` and `cache_timeout=600`, which are not SSHFS 3 directory-cache options. Replaced them with documented `dir_cache=yes` and `dcache_timeout=600`.
- The comment described `fusermount -uz` as a force unmount. In FUSE, `-z` is lazy unmount. Updated the wording to "Lazy unmount if busy."

## Review Notes
The fstab and systemd examples use `fuse.sshfs`, which upstream SSHFS documents as supported for backward compatibility; upstream now recommends `sshfs` as the fstab filesystem type, but the existing examples remain technically valid.
