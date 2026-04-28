# Validation Summary: How to Configure NFS Exports to Allow Specific IPv4 Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NFS (Network File System) on Linux
- `nfs-kernel-server` package (Debian/Ubuntu)
- `/etc/exports` configuration file
- `exportfs` CLI utility
- `showmount` CLI utility
- `systemctl` / `journalctl` (systemd)
- IPv4 access control (single hosts and CIDR subnets)

## Sources Consulted
- `exports(5)` man page (Linux nfs-utils): https://man7.org/linux/man-pages/man5/exports.5.html
- `exportfs(8)` man page: https://man7.org/linux/man-pages/man8/exportfs.8.html
- `showmount(8)` man page: https://man7.org/linux/man-pages/man8/showmount.8.html
- Ubuntu Server documentation on NFS: https://ubuntu.com/server/docs/network-file-system-nfs
- Debian Wiki — NFS Server Setup: https://wiki.debian.org/NFSServerSetup
- Linux NFS FAQ / nfs-utils release notes (default of `no_subtree_check` since nfs-utils 1.1.0)

## Issues Found
No technical issues found.

Verified specifically:
- `/etc/exports` syntax `path client(options)` with whitespace as separator is correct.
- Backslash (`\`) line continuation in `/etc/exports` is supported per `exports(5)`.
- Export options listed (`rw`, `ro`, `sync`, `async`, `no_subtree_check`, `root_squash`, `no_root_squash`, `all_squash`) are accurate; `root_squash` is correctly identified as the default.
- `no_subtree_check` is correctly recommended (and is the default since nfs-utils 1.1.0 — explicitly setting it suppresses warnings).
- `sudo apt install nfs-kernel-server` matches the Debian/Ubuntu package name, and `chown nobody:nogroup` is correct for that distro family (which provides the `nogroup` group).
- `exportfs -ra` (re-export all) and `exportfs -v` (verbose) flags are valid.
- `systemctl restart nfs-kernel-server` is the correct service name on Debian/Ubuntu.
- `showmount -e <host>` and `showmount -e localhost` usage is correct.
- CIDR notation (`10.0.0.0/24`) and loopback (`127.0.0.1`) as client specs are supported.

## Review Notes
- The example output comment for `showmount -e 203.0.113.10` shows just the export entry; real output is preceded by an `Export list for <host>:` header line. This is a minor presentational simplification, not a technical error.
- The grep-based check `exportfs -v | grep -v "10\.\|192\.168\.\|127\."` only filters RFC1918 10/8, 192.168/16, and loopback. It does not exclude 172.16.0.0/12 (also RFC1918) or unique-local/private ranges, so it may produce false positives. Adequate as an illustrative quick check, but readers using it in production should expand the pattern.
- On RHEL/CentOS/Fedora the package is `nfs-utils`, the service is `nfs-server`, and the anonymous group is `nobody` (not `nogroup`). The post is implicitly Debian/Ubuntu-scoped, which is internally consistent — no change needed, but worth noting for cross-distro readers.
