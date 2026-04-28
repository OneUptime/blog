# Validation Summary: How to Troubleshoot NFS Mount Failures on IPv4

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- NFS (Network File System) — server and client
- nfs-kernel-server (Debian/Ubuntu systemd service)
- rpcbind / portmapper
- exportfs (`/etc/exports` configuration)
- showmount, mount.nfs
- iptables, ufw (firewall)
- conntrack
- tcpdump, ss, journalctl
- Linux systemd

## Sources Consulted
- showmount(8) — https://man7.org/linux/man-pages/man8/showmount.8.html
- nfs(5) — https://man7.org/linux/man-pages/man5/nfs.5.html
- exports(5) — https://man7.org/linux/man-pages/man5/exports.5.html
- exportfs(8) — https://man7.org/linux/man-pages/man8/exportfs.8.html
- umount(8) — https://man7.org/linux/man-pages/man8/umount.8.html
- mount.nfs(8) — https://man7.org/linux/man-pages/man8/mount.nfs.8.html
- RFC 1833 (Binding Protocols for ONC RPC v2) — https://datatracker.ietf.org/doc/html/rfc1833
- Debian NFS Server wiki — https://wiki.debian.org/NFS/Server
- Red Hat: Deploying an NFS server (RHEL 9) — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services

## Issues Found

1. **Wrong showmount flag for verifying export configuration.** The "Access denied" section used `sudo showmount -a localhost` to "Verify the client IP is now listed" after re-exporting. Per showmount(8), `-a`/`--all` lists currently *active mounts* (host:dir of clients that have mounted), not the export configuration. To verify the exports list, the correct flag is `-e`/`--exports`. Changed to `sudo showmount -e localhost`.

2. **Outdated guidance about the `intr` mount option.** The "Mount hangs" section said: `# Kill the hung mount with Ctrl+C (if 'intr' option present)`. Per nfs(5), the `intr` option has been a no-op since kernel 2.6.25 (released 2008) and is preserved only for backward compatibility — relying on it to interrupt a hung hard mount is misleading. Updated the comment to note that `intr` is a no-op since kernel 2.6.25 and kept the `kill -9 $(pgrep mount.nfs)` recovery step.

## Review Notes
- The `nfs-kernel-server` service name is specific to Debian/Ubuntu. On RHEL/CentOS/Fedora the equivalent service is `nfs-server`. The post is consistent throughout but readers on RHEL-family distros will need to adjust.
- `no_subtree_check` has been the default in nfs-utils since 1.1.0, so the example `/etc/exports` line is valid and explicitly documents the intent.
- The example uses TEST-NET-3 (203.0.113.0/24) per RFC 5737, which is appropriate for documentation.
- Only TCP port 2049 is required for NFSv4. Port 111 (rpcbind) and the dynamic mountd port are NFSv3-era requirements; the post's portmapper checks are still useful for NFSv3 environments.
- The `soft` mount option with `timeo=30` can cause silent data corruption on writes if the server is briefly unreachable; for read-only or non-critical mounts it is fine, but production write workloads should generally stay with `hard,intr`-style semantics (or rather, `hard` plus `softerr`/`softreval` per modern nfs(5) guidance). Not corrected because the post's framing ("get error instead of hang") is reasonable for a debugging context.
