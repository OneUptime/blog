# Validation Summary: How to Create Btrfs Subvolumes on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux
- Btrfs
- Btrfs subvolumes
- Btrfs mount options
- Btrfs quota groups
- `/etc/fstab`

## Sources Consulted
- Btrfs Subvolumes documentation: https://btrfs.readthedocs.io/en/latest/Subvolumes.html
- Btrfs mount options documentation: https://btrfs.readthedocs.io/en/latest/ch-mount-options.html
- Btrfs `btrfs-subvolume(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-subvolume.html
- Btrfs `btrfs-qgroup(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-qgroup.html
- Btrfs `btrfs-quota(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-quota.html
- Btrfs file attributes documentation: https://btrfs.readthedocs.io/en/latest/ch-file-attributes.html
- Ubuntu Btrfs community documentation: https://help.ubuntu.com/community/btrfs
- Ubuntu `btrfs-subvolume(8)` man page: https://manpages.ubuntu.com/manpages/noble/man8/btrfs-subvolume.8.html

## Issues Found
- The post stated that subvolumes can have different Btrfs mount options and showed per-subvolume `compress` and `nodatacow` settings in `/etc/fstab`. Upstream Btrfs documentation says most Btrfs-specific mount options apply to the whole filesystem, with the first mounted subvolume's options taking effect. I removed the misleading per-subvolume `compress`/`nodatacow` examples and added a note explaining the filesystem-wide behavior.
- The database No_COW section used `mount -o nodatacow` as if it were a per-subvolume setting. I changed it to use `chattr +C` on an empty database directory or subvolume so new database files inherit the No_COW attribute.
- The mount-by-ID example used `subvolid=258`, but the earlier example already assigned ID 258 to `backups`, not `postgresql`. I replaced it with a placeholder ID derived from the preceding `grep postgresql` command.
- The generation number explanation said it increments on each change. Btrfs documentation describes it as an internal counter updated by transactions, so I corrected the wording.
- The deletion section claimed snapshots must be removed before deleting a subvolume and showed a non-recursive command under a recursive-delete comment. I corrected this to describe nested subvolumes and changed the command to `btrfs subvolume delete --recursive`.
- The Ubuntu layout wording implied all current Ubuntu Btrfs installs use the same `@` and `@home` layout. I softened it to "Ubuntu-style" because installer behavior varies by release and install path.

## Review Notes
The post is now technically valid for the Btrfs command behavior it demonstrates. The examples still assume the target devices are already formatted as Btrfs and that mount-point directories exist; that is reasonable for a focused subvolume guide but could be made more explicit in a future setup-oriented article.
