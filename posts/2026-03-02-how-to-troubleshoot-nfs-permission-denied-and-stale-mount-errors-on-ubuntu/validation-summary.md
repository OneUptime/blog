# Validation Summary: How to Troubleshoot NFS 'Permission Denied' and Stale Mount Errors on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- NFS (NFSv3 / NFSv4) on Linux / Ubuntu
- `nfs-kernel-server` / `nfs-common` utilities (`exportfs`, `nfsstat`, `showmount`, `rpcinfo`)
- `/etc/exports` and `/etc/fstab` configuration
- NFS export options (`root_squash`, `no_root_squash`, `all_squash`, `anonuid`/`anongid`, `sec=sys`, `no_subtree_check`, `wdelay`)
- NFS mount options (`hard`, `soft`, `softerr`, `intr`, `timeo`, `retrans`, `noatime`, `_netdev`)
- Linux utilities: `id`, `getent`, `usermod`, `namei`, `getfacl`, `lsof`, `fuser`, `umount`, `nc`, `dd`, `journalctl`, `dmesg`

## Sources Consulted
- `nfs(5)` man page — https://man7.org/linux/man-pages/man5/nfs.5.html (mount options, `intr` deprecation, `soft`/`softerr` error semantics)
- `exports(5)` man page — https://man7.org/linux/man-pages/man5/exports.5.html (`root_squash`, `all_squash`, `anonuid`/`anongid`, `no_subtree_check` default since nfs-utils 1.1.0)
- `exportfs(8)`, `nfsstat(8)`, `showmount(8)`, `rpcinfo(8)` man pages
- `namei(1)`, `fuser(1)`, `lsof(8)`, `umount(8)`, `usermod(8)`, `getfacl(1)` man pages
- Linux kernel NFS client documentation

## Issues Found
1. **Deprecated `intr` mount option recommended.** The original post recommended `intr` in `/etc/fstab` and in the recovery script. The `intr` option has been **ignored since Linux kernel 2.6.25 (2008)** per the current `nfs(5)` man page. Removed `intr` from both the fstab example and the recovery script. Added a note explaining the deprecation, and pointed readers to `softerr` (which returns `ETIMEDOUT`) as the modern alternative if they want interruptible/timeout behavior.

2. **Incorrect error code for `soft` mount timeouts.** The original post stated: *"With `soft` mounts, a timeout returns ESTALE errors to applications"*. This is wrong — `ESTALE` is reserved for stale file handles. Per `nfs(5)`, a `soft` mount timeout returns **`EIO`** to applications. (`softerr`, a newer option, returns `ETIMEDOUT`.) Corrected the text to say `EIO`.

## Review Notes
- All other commands and flags verified against current man pages: `exportfs -v`, `nfsstat -c`/`-m`, `namei -l`, `getfacl`, `fuser -m`/`-km`, `lsof +D`, `umount -f`/`-l`, `rpcinfo -p`, `showmount -e`, `nc -zv`, `mount -t nfs4`, `usermod -u` — all correct.
- The `root_squash` default and the `nobody`/UID 65534 anonymous mapping are correct per `exports(5)`.
- `no_subtree_check` being the default (since nfs-utils 1.1.0) matches the example output shown in Step 2.
- `lsof +D` can be slow on large NFS trees — worth a mention in a future revision, but not technically incorrect.
- `rpcinfo -p` works for verifying RPC services on the server; with NFSv4-only servers only port 2049 is strictly required, but `rpcbind` is typically still running on Linux NFS servers, so the command remains useful.
- The advice about `no_root_squash` being a security risk (use only for specific trusted clients) is appropriately cautious and accurate.
