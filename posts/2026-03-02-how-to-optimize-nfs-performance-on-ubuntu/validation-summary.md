# Validation Summary: How to Optimize NFS Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- NFS (NFSv3, NFSv4, NFSv4.1, NFSv4.2)
- Ubuntu (nfs-kernel-server, nfs-common packages)
- fio (Flexible I/O Tester)
- nfsiostat / nfsstat
- Linux kernel sysctl parameters (net.core.*, net.ipv4.tcp_*, vm.dirty_*)
- systemd (nfs-server service)
- Netplan (jumbo frame / MTU configuration)
- /etc/nfs.conf, /etc/exports, /etc/fstab, /proc/fs/nfsd, /proc/net/rpc/nfsd

## Sources Consulted
- nfs(5) man page (mount options: rsize, wsize, timeo, retrans, hard, proto, actimeo)
- exports(5) man page (sync, async, no_subtree_check, no_root_squash, ro/rw)
- nfs.conf(5) man page (valid sections and options)
- nfsd(7) and nfs-server.service unit (default thread count, /proc/fs/nfsd/threads)
- fio documentation (https://fio.readthedocs.io)
- Linux kernel networking documentation for sysctl parameters
- nfsiostat(8), nfsstat(8) man pages
- Netplan reference (https://netplan.io)
- RFC 7530 / RFC 8881 for NFSv4 behavior

## Issues Found
- **Invalid `/etc/nfs.conf` option**: The original example included an `[exportfs]` section with `rootdir=/`. This option is not documented or recognized in the `[exportfs]` section of `/etc/nfs.conf` (nfs-utils only supports a small set of options like `debug` there, and `rootdir` is not among them). Including it could mislead readers into thinking it changes the NFSv4 pseudo-root or similar behavior. Removed the `[exportfs]` block entirely while keeping the `[nfsd]` settings (`threads`, `grace-time`, `lease-time`) which are valid.

## Review Notes
- The `mount -t nfs4` syntax used throughout still works, but the nfs(5) man page notes the `nfs4` filesystem type is somewhat discouraged for new applications in favor of `-t nfs -o nfsvers=4`. Both are functional; not changed.
- The comment "Apply without restart" before `systemctl reload nfs-server` is slightly optimistic: `ExecReload` for `nfs-server.service` runs `exportfs -r`, which re-reads `/etc/exports` but does NOT apply thread-count or grace-time changes from `/etc/nfs.conf`. The author partially addresses this with the immediately-following `/proc/fs/nfsd/threads` snippet, so the guidance is workable.
- `nfs-server.service` works on modern Ubuntu (nfs-utils ships the unit upstream; the older `nfs-kernel-server` name is also accepted as an alias on Ubuntu).
- Linux's default and maximum rsize/wsize is 1 MiB (1048576) — correct.
- `timeo=600` = 60 seconds (units are tenths of a second) — correct.
- `ping -M do -s 8972` correctly tests a 9000-byte MTU (8972 + 20 IP + 8 ICMP = 9000) — correct.
- Default NFS server thread count of 8 is correct.
- The 110-115 MB/s expectation on 1GbE for sequential reads with tuned NFS is realistic.
