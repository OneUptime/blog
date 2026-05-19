# Validation Summary: How to Configure Persistent Mounts with /etc/fstab on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- Linux `/etc/fstab`
- util-linux `mount`, `findmnt`, `blkid`, and `lsblk`
- systemd mount units and `systemd-fstab-generator`
- ext4, XFS, Btrfs, tmpfs, swap, NFS, and CIFS mounts

## Sources Consulted
- Ubuntu Manpage Repository: `fstab(5)` - https://manpages.ubuntu.com/manpages/jammy/man5/fstab.5.html
- Local util-linux `fstab(5)`, `mount(8)`, `findmnt(8)`, `blkid(8)`, and `lsblk(8)` man pages / help output
- freedesktop.org `systemd.mount(5)` - https://www.freedesktop.org/software/systemd/man/systemd.mount.html
- Local `systemd.mount(5)` and `systemd-fstab-generator(8)` man pages
- Btrfs `fsck.btrfs(8)` documentation - https://btrfs.readthedocs.io/en/latest/fsck.btrfs.html
- Ubuntu Manpage Repository: `fsck.xfs(8)` - https://manpages.ubuntu.com/manpages/stonking/man8/fsck.xfs.8.html
- Linux man-pages project: `xfs(5)` - https://man7.org/linux/man-pages/man5/xfs.5.html
- Linux man-pages project: `nfs(5)` - https://man7.org/linux/man-pages/man5/nfs.5.html

## Issues Found
- The fstab field separator description said fields are space-separated. Updated it to whitespace-separated because `fstab(5)` allows spaces or tabs.
- The `LABEL=...` description said labels require setting during format. Updated it to say a filesystem label is required, because labels can also be changed later with filesystem-specific tools.
- The `defaults` option was described as an exact equivalence. Updated the wording to "usually" because `mount(8)` documents that defaults depend on the kernel and filesystem, even though the usual default set is `rw,suid,dev,exec,auto,nouser,async`.
- The fsck pass guidance and examples treated XFS and Btrfs like traditional fsck-checked filesystems. Updated the XFS and Btrfs examples to use pass `0`, and clarified that pass `2` is for local filesystems that support boot-time fsck checks.
- The `_netdev` wording said it ensures the network is up before mounting. Updated it to the more precise systemd behavior: the mount is treated as a network mount and ordered after network startup.
- The `mount -a` explanation omitted `noauto`. Updated it to state that `mount -a` skips entries marked `noauto`.
- The dry-run command used `mount -a --fake` with a comment saying it shows what would be mounted. Updated it to `mount -av --fake` so verbose output is requested.
- The `findmnt --fstab` comment said it shows mounts that came from fstab. Updated it to say it shows entries defined in fstab, because `--fstab` reads the static table rather than filtering the current mount table.

## Review Notes
The post is technically relevant and appropriate for the blog. The examples are generally correct after the fixes above. Future improvements could mention `x-systemd.automount` for network shares, but that is an enhancement rather than a correctness issue.
