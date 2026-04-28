# Validation Summary: How to Mount an NFS Share by IPv4 Server Address

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NFS (Network File System) v3 and v4
- Linux NFS client utilities (`nfs-common`, `nfs-utils`)
- `mount(8)` and `umount(8)` commands
- `showmount`, `rpcinfo`, `df`, `dd` utilities
- IPv4 addressing for NFS server reference

## Sources Consulted
- Linux `nfs(5)` man page (mount option semantics, deprecation of `intr`/`nointr` after kernel 2.6.25): https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux `mount(8)` man page: https://man7.org/linux/man-pages/man8/mount.8.html
- Linux `showmount(8)` man page: https://man7.org/linux/man-pages/man8/showmount.8.html
- Debian/Ubuntu `nfs-common` package documentation
- Red Hat `nfs-utils` package documentation
- RFC 1813 (NFSv3) and RFC 7530 (NFSv4) for protocol semantics

## Issues Found

1. **`intr` mount option presented as active.** The post recommended `intr` in mount option lists, in the explanatory comments, and in the conclusion, describing it as "Allow interrupting hung NFS operations" / "hard with intr for mounts carrying critical data". This is technically incorrect for any modern Linux client: per the `nfs(5)` man page, the `intr`/`nointr` options have been deprecated since Linux kernel 2.6.25 (released April 2008) and are silently ignored — only SIGKILL can interrupt a pending NFS operation on hard mounts.
   - **Fix:** Removed `intr` from the example mount command, removed the misleading line from the "Mount options explained" comments and added a note that it is deprecated/ignored on kernels >= 2.6.25, updated the reference table entry to note its deprecated status, and reworded the conclusion to drop the `intr` recommendation while explaining how interruption now works.

## Review Notes

- `timeo` is correctly described as units of tenths of a second; `timeo=14` (1.4s) and `timeo=600` (60s) are accurate, and 600 is the standard default for TCP mounts.
- `rsize=8192`/`wsize=8192` is conservative; the kernel auto-negotiates a larger default (commonly 1 MiB) when the option is omitted, but the values shown are valid and the post explicitly frames the larger 65536 example for performance, so this is fine for a tutorial.
- `showmount -e <host>` relies on the mountd RPC service, which is part of the NFSv3 stack. NFSv4-only servers (where the admin has disabled mountd) may not respond to `showmount`. The post does not call this out — not strictly an error, but a useful caveat to add in a future revision.
- The example IPs (`203.0.113.10`, `10.0.0.0/24`) use TEST-NET-3 / RFC 1918 ranges appropriately for documentation, which is good practice.
- `sudo dd if=/mnt/nfs-data/largefile of=/dev/null bs=1M count=100` does not strictly need `sudo` if the file is world-readable, but it does no harm.
