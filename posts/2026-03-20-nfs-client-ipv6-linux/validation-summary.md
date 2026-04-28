# Validation Summary: How to Configure NFS Client with IPv6 on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NFS (Network File System) v3 and v4
- IPv6 networking
- Linux kernel NFS client
- nfs-utils (mount.nfs, showmount, nfsstat, rpcinfo)
- /etc/fstab
- systemd .mount units
- autofs / automount
- ip / ip6tables
- tcpdump
- rpcbind

## Sources Consulted
- nfs(5) man page: https://man7.org/linux/man-pages/man5/nfs.5.html
- mount(8) man page: https://man7.org/linux/man-pages/man8/mount.8.html
- rpcinfo(8) man page: https://man7.org/linux/man-pages/man8/rpcinfo.8.html
- autofs(5) man page: https://man7.org/linux/man-pages/man5/autofs.5.html
- systemd.mount(5): https://www.freedesktop.org/software/systemd/man/systemd.mount.html
- linux-nfs IPv6 planning document: https://wiki.linux-nfs.org/wiki/index.php/Ipv6PlanningDocument
- Fedora NFSClientIPv6 feature page: https://fedoraproject.org/wiki/Features/NFSClientIPv6
- Red Hat solution on `intr` mount option: https://access.redhat.com/solutions/157873
- Debian bug #809392 (showmount IPv6 support)

## Issues Found
1. **`rpcinfo -p` does not work over IPv6** — The original troubleshooting section used `rpcinfo -p "[2001:db8::1]"`. The `-p` option uses the v2 portmapper protocol, which only supports `tcp`/`udp` netids, not `tcp6`/`udp6`. Per rpcinfo(8), this command would not work for an IPv6-only NFS server. Fixed by replacing it with `rpcinfo -T tcp6 2001:db8::1 100000` and adding a brief comment explaining why the transport must be specified.

## Review Notes
- The post mentions "kernel 2.6.37+" as the threshold for full NFS-over-IPv6 support. Initial NFS IPv6 work landed earlier (around 2.6.30), but comprehensive client support (NFSv3 + NFSv4 over IPv6, plus tooling) was effectively complete by the 2.6.37 timeframe. The claim is defensible and matches the companion server-side post; left unchanged.
- The `intr` mount option is included throughout the post. Per nfs(5), `intr`/`nointr` are silently ignored on kernels after 2.6.25 (no-op for backward compatibility). Not technically incorrect — the mounts will succeed — but the option has no effect on any modern kernel. Could be removed in a future revision.
- `mount -t nfs4` is documented in nfs(5) as deprecated in favor of `-t nfs -o vers=4` (or `nfsvers=4`), but `nfs4` remains accepted by mount.nfs. Left unchanged.
- `ping6` is deprecated in newer iputils (the modern form is `ping -6` or just `ping` with an IPv6 address), but it still works on essentially all current distributions.
- `showmount -e [2001:db8::1]` works on modern nfs-utils built against libtirpc. Note that `showmount` only works against NFSv3 (mountd) servers — it returns nothing for NFSv4-only exports, regardless of address family. This caveat could be added in a future revision.
- For autofs IPv6 maps, the post's escaped-colon syntax `[2001\:db8\:\:1]:/srv/shared` is correct by default. Modern autofs also supports the `--no-slashify-colons` option in `auto.master` to avoid the escaping.
- The `async` mount option in the performance-tuning example differs from `sync` used elsewhere in the post; this is intentional (async is faster but trades off durability) and technically correct.
