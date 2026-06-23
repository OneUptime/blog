# Validation Summary: How to Mount NFS Shares on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step technical how-to)

## Technologies Covered
- NFS (Network File System) — protocol versions v2/v3/v4/v4.1/v4.2
- Ubuntu (20.04 / 22.04 / 24.04)
- `nfs-common` client utilities (`mount.nfs`, `showmount`, `nfsstat`, `rpcinfo`)
- `/etc/fstab` persistent mount configuration
- systemd mount units and `_netdev` / `x-systemd.*` options
- autofs (master maps, indirect/wildcard/direct maps)
- NFSv4 idmapd (`/etc/idmapd.conf`, `nfsidmap`)
- Kerberos NFS security (`sec=krb5/krb5i/krb5p`)
- UFW / iptables firewalling

## Sources Consulted
- `nfs(5)` man page (mount options: hard/soft, timeo, retrans, rsize/wsize, sec=, nfsvers, _netdev) — https://man7.org/linux/man-pages/man5/nfs.5.html
- `mount(8)` / `nfs(5)` filesystem-independent and NFS-specific options
- nfs-utils documentation (showmount, nfsstat, rpcinfo, rpcdebug, nfsidmap) — https://linux-nfs.org/
- `autofs(5)` and `auto.master(5)` man pages — https://man7.org/linux/man-pages/man5/autofs.5.html
- systemd.mount(5) / systemd-fstab-generator (x-systemd.automount, _netdev) — https://www.freedesktop.org/software/systemd/man/systemd.mount.html
- Ubuntu Server Guide: NFS — https://ubuntu.com/server/docs

## Issues Found
1. **`intr` mount option mislabeled as "deprecated in NFSv4"** (Connection and Recovery Options table). Per `nfs(5)`, the `intr`/`nointr` options were deprecated and have been **silently ignored since Linux kernel 2.6.25** — for all NFS versions, not just NFSv4. Since every supported Ubuntu release ships a far newer kernel, `intr` is always a no-op. Corrected the table description to "deprecated and silently ignored since kernel 2.6.25" and changed the recommendation from "Use with hard mounts" to "No longer needed on modern kernels."

## Review Notes
- The `intr` option still appears in several example `fstab`/autofs entries (e.g., the "common recommended options" entry, read-only example, and the complete example config). These were intentionally left in place: modern kernels silently ignore the flag rather than rejecting it, so the examples remain functionally correct. They could be trimmed in a future stylistic pass, but leaving them does not produce an error.
- NFSv2 described as "UDP only" is a reasonable historical simplification; NFSv2 predominantly used UDP and TCP support became standard with NFSv3. Acceptable for an overview table.
- `timeo=600` correctly explained as 60 seconds (value is in tenths of a second).
- `rsize`/`wsize` values (131072 = 128KB, 1048576 = 1MB) are valid; 1MB is the current Linux client maximum.
- The `rpcinfo`/`showmount` troubleshooting steps are MOUNT/rpcbind-oriented and most useful for NFSv3; pure NFSv4-only servers do not require rpcbind, so these commands may return little for v4-only setups. The post already flags that NFSv4 exports behave differently, so this is an acceptable caveat rather than an error.
- systemd service name `nfs-idmapd`, `nfsidmap -c`, `_netdev`, `x-systemd.automount`, and the systemd `.mount` unit format are all correct for current Ubuntu/systemd.
- Security guidance (`nosuid`, `noexec`, `nodev`, `sec=krb5p`, single-port 2049 firewalling for NFSv4) is accurate and aligns with best practices.
