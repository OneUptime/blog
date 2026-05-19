# Validation Summary: How to Configure NFS Exports with Specific Options on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- Linux NFS server (`nfs-kernel-server`, `nfs-utils`)
- `/etc/exports`
- NFSv3 and NFSv4
- `exportfs`
- `systemctl`
- `ufw`

## Sources Consulted
- Linux `exports(5)` manual page: https://www.man7.org/linux/man-pages/man5/exports.5.html
- Linux `exportfs(8)` manual page: https://man7.org/linux/man-pages/man8/exportfs.8.html
- Ubuntu Server NFS documentation: https://ubuntu.com/server/docs/how-to/networking/install-nfs/
- Ubuntu `rpc.nfsd(8)` manual page: https://manpages.ubuntu.com/manpages/jammy/man8/rpc.nfsd.8.html
- Linux NFS NFSv4 configuration notes: https://wiki.linux-nfs.org/wiki/index.php/Nfsv4_configuration

## Issues Found
- The anonymous UID/GID example used fixed values of `999`, which may not match the actual UID/GID created by `useradd`. Changed the export snippet to explicitly tell readers to replace the example numeric UID/GID with the values returned by `id nfsanon`.
- The `no_wdelay` section was titled "Locking Options", but `no_wdelay` controls write-delay behavior, not NFS locking. Renamed the section to "Write Delay Options".
- The per-client precedence note said more specific client specs always take precedence and should be placed first. The `exports(5)` manual defines precedence by client spec type, with line order applying only among matches of the same type. Replaced the note with the documented behavior.
- The NFSv4 pseudo-root section incorrectly suggested configuring the NFSv4 root in `/etc/default/nfs-kernel-server` with `RPCNFSDARGS`. The pseudo-root is marked in `/etc/exports` using `fsid=0` or `fsid=root`; Ubuntu 22.04 and later also use `/etc/nfs.conf` for daemon settings. Removed the incorrect daemon-argument snippet and corrected the explanation.

## Review Notes
The remaining commands and export options are consistent with the referenced documentation. Ubuntu 22.04 and later use `/etc/nfs.conf` for NFS daemon configuration, so future posts that cover daemon-level options should prefer that file over older `/etc/default/nfs-*` examples.
