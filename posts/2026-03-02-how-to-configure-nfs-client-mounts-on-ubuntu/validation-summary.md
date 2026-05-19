# Validation Summary: How to Configure NFS Client Mounts on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- NFS client mounts
- nfs-common / nfs-utils
- /etc/fstab
- systemd mount units
- Linux mount, umount, nfsstat, showmount, rpcinfo

## Sources Consulted
- Ubuntu Server documentation: Network File System (NFS): https://ubuntu.com/server/docs/how-to/networking/install-nfs/
- Ubuntu manpage: nfs(5), fstab format and NFS mount options: https://manpages.ubuntu.com/manpages/noble/man5/nfs.5.html
- Ubuntu manpage: mount.nfs(8): https://manpages.ubuntu.com/manpages/noble/man8/mount.nfs.8.html
- Ubuntu manpage: nfsstat(8): https://manpages.ubuntu.com/manpages/noble/man8/nfsstat.8.html
- Ubuntu manpage: showmount(8): https://manpages.ubuntu.com/manpages/noble/man8/showmount.8.html
- Ubuntu package details for nfs-common: https://packages.ubuntu.com/noble/net/nfs-common
- systemd.mount documentation: https://www.freedesktop.org/software/systemd/man/256/systemd.mount.html
- IETF RFC 8881, Network File System (NFS) Version 4 Minor Version 1 Protocol: https://www.ietf.org/rfc/rfc8881.html

## Issues Found
- Replaced `nfsstat --version` with `command -v mount.nfs nfsstat showmount`, because the Ubuntu `nfsstat(8)` manpage does not document a `--version` option.
- Clarified that `rpcinfo` is available through the `rpcbind` dependency pulled in by `nfs-common`, rather than directly provided by the `nfs-common` package.
- Changed NFSv4 examples from `-t nfs4` or `nfs4` fstab/systemd types to `-t nfs` / `Type=nfs` with `vers=4` or `vers=4.1`, because Ubuntu's `nfs(5)` manpage says the `nfs4` fstype in `/etc/fstab` is deprecated and modern `mount.nfs` handles NFS versions.
- Removed `intr` from recommended mount options and fstab/systemd examples, because Ubuntu's `nfs(5)` documents `intr` / `nointr` as backward-compatibility options ignored after Linux kernel 2.6.25.
- Corrected the `retrans=2` description to clarify that it triggers timeout recovery and that hard mounts continue retrying instead of simply giving up.
- Added a caveat that NFSv4-only servers may not expose the MNT service queried by `showmount`, matching the `showmount(8)` documented limitation.

## Review Notes
The remaining commands and examples are technically valid for Ubuntu systems with `nfs-common` installed. The guide intentionally uses static example IPs and paths; real deployments must match the server's export configuration and network policy.
