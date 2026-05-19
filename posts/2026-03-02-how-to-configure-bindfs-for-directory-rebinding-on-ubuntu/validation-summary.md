# Validation Summary: How to Configure bindfs for Directory Rebinding on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- bindfs
- FUSE
- Linux permissions and ownership
- /etc/fstab
- Docker bind mounts and container users
- OverlayFS

## Sources Consulted
- bindfs upstream manual: https://bindfs.org/docs/bindfs.1.html
- Ubuntu bindfs package metadata for Ubuntu Noble: `apt-cache show bindfs`
- Docker CLI reference for `docker run`: https://docs.docker.com/reference/cli/docker/container/run/
- Linux `mount(8)` manual page for OverlayFS example syntax: https://man7.org/linux/man-pages/man8/mount.8.html
- Linux kernel OverlayFS documentation: https://www.kernel.org/doc/html/latest/filesystems/overlayfs.html

## Issues Found
- The group-writable permissions example used `--perms=og+w`, which makes both group and other permission bits writable. Changed it to `--perms=g+w` to match the stated goal.
- The permission-mapping section included a comment about exposing files matching criteria, but the shown bindfs options do not filter files. Removed the inaccurate comment.
- The first `/mnt` mountpoint creation command omitted `sudo`, which would fail for a normal user on a standard Ubuntu system. Changed it to `sudo mkdir -p /mnt/alice-projects`.
- The fstab option summary described `perms=MODE` as forcing a permission mode. Updated the wording because bindfs `perms` applies bindfs permission mapping and can use chmod-like symbolic transformations as well as octal modes.
- The non-root FUSE section said `user_allow_other` is already the Ubuntu default and framed it as allowing users to mount FUSE filesystems generally. Updated it to explain that `user_allow_other` permits non-root users to specify FUSE `allow_other`/`allow_root`, which matters because bindfs enables `allow_other` by default.
- The non-root example omitted creation of the mountpoint. Added `mkdir -p ~/documents-mirror`.
- The OverlayFS example created `/mnt/app-view` without `sudo`, which would fail for a normal user on a standard Ubuntu system. Changed it to `sudo mkdir -p /mnt/app-view`.

## Review Notes
The bindfs command options shown are valid for Ubuntu's packaged bindfs 1.14.7 and match the upstream bindfs manual. The shorthand `-u` and `-g` options are current aliases for `--force-user` and `--force-group`; the deprecated forms are `--user` and `--group`, which the post does not use. The fstab example correctly uses colon-separated permission transformations because commas are option separators in `/etc/fstab`.
