# Validation Summary: How to Configure NFSv4 Pseudo-Filesystem for IPv4 Exports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NFSv4 (Network File System version 4)
- Linux NFS server (`nfs-kernel-server`, `nfs-utils`)
- Linux bind mounts (`mount --bind`)
- `/etc/fstab` configuration
- `/etc/exports` configuration
- `exportfs`, `showmount`, `nfsstat` utilities
- NFSv4 ID mapping (`/etc/idmapd.conf`)

## Sources Consulted
- `man 5 exports` (Linux nfs-utils) — verified `fsid=0`, `crossmnt`, `no_subtree_check`, `no_root_squash`, `rw`, `ro`, `sync`
- `man 5 nfs` — verified `nfs4` mount options (`rw`, `soft`, `_netdev`, `rsize`, `wsize`)
- `man 8 exportfs` — verified `-ra` and `-v` flags
- `man 8 showmount` — verified `-e` flag
- `man 8 nfsstat` — verified `-m` (mounted filesystems) and `-s` (server stats) flags
- `man 5 fstab` and `man 8 mount` — verified bind mount fstab syntax
- RFC 7530 / RFC 8881 — NFSv4 pseudo-filesystem concept
- Linux NFS HOWTO and kernel documentation on NFSv4 export configuration

## Issues Found
No technical issues found.

The post correctly describes:
- The NFSv4 pseudo-filesystem model and its difference from NFSv3
- The use of `fsid=0` to designate the export root
- The use of `crossmnt` to allow clients to traverse mount points
- Bind mount syntax in `/etc/fstab` (`none bind 0 0`)
- Client-side path resolution relative to the pseudo-root (e.g., `server:/data` maps to `/export/data`)
- `mount -t nfs4` syntax and common options
- Verification commands (`nfsstat -m`, `exportfs -v`, `showmount -e`)

## Review Notes
- The post uses `/var/logs` (plural) as an example source directory for a bind mount. This is just an arbitrary example path created with `mkdir -p`, not a reference to the standard `/var/log` directory, so it is technically valid.
- The `showmount -e localhost` command relies on `rpc.mountd` being available. In NFSv4-only setups where the MOUNT protocol is disabled, this may not work; however, in typical Linux NFS server installations `rpc.mountd` is running, so the command works as documented.
- The post separately exports subdirectories under the pseudo-root with different permission options (e.g., `ro` for logs, `no_root_squash` for backups). This is a valid pattern for fine-grained access control on top of the pseudo-root export.
- The IPv4 addresses used (`10.0.0.0/24`, `203.0.113.10`) are appropriate documentation/private ranges per RFC 5737 and RFC 1918.
