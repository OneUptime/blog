# Validation Summary: How to Export NFS Shares to IPv4 Subnets Using CIDR Notation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NFS (Network File System), specifically the Linux nfs-utils implementation
- /etc/exports configuration syntax
- exportfs CLI (nfs-utils)
- showmount CLI (nfs-utils)
- mount -t nfs (util-linux / nfs-utils)
- iptables (netfilter)
- IPv4 CIDR notation

## Sources Consulted
- Linux exports(5) man page (nfs-utils): https://man7.org/linux/man-pages/man5/exports.5.html
- Linux exportfs(8) man page: https://man7.org/linux/man-pages/man8/exportfs.8.html
- Linux showmount(8) man page: https://man7.org/linux/man-pages/man8/showmount.8.html
- iptables(8) man page and multiport extension docs
- RFC 4950 / NFSv4 specifications regarding default port (TCP 2049)
- Standard CIDR address-space arithmetic (/24 = 256, /16 = 65536, /28 = 16, /8, /12 ranges)

## Issues Found
No technical issues found.

Verified specific points:
- CIDR notation (e.g., `192.168.1.0/24`) is supported in /etc/exports — confirmed by exports(5) "IP networks" section.
- Legacy netmask form `192.168.1.0/255.255.255.0` is also supported, as the post claims.
- Wildcard hostname matching (`*.internal.example.com`) is documented in exports(5).
- Match precedence: a single host (`10.0.0.5`) takes precedence over an IP network (`10.0.0.0/24`) on the same export line — exports(5) lists the order: single host > netgroups > wildcards > IP networks. The post's "Combination" example is accurate.
- `exportfs -ra` (re-export all, sync with /etc/exports) and `exportfs -v` (verbose listing) flags are correct.
- Default NFS export options shown (`wdelay,hide,no_subtree_check`) match the typical defaults in `exportfs -v` output.
- NFS port usage: 2049/TCP for NFS itself and 111/TCP for rpcbind/portmap (used by NFSv3). NFSv4 strictly requires only 2049/TCP. The iptables example correctly lists both.
- Address counts (/24=256, /16=65536, /28=16) are arithmetically correct.

## Review Notes
- The iptables example only filters TCP. NFSv3 can also use UDP (port 2049 and rpcbind 111/UDP, plus dynamically assigned ports for mountd, statd, lockd unless pinned). For NFSv4-only deployments (the modern default on Linux), TCP-only filtering is sufficient. This is not incorrect, but could be noted as version-dependent.
- The grep command `sudo exportfs -v | grep "0.0.0.0\|/0"` will also match any subnet that ends in `/0` literally (only `0.0.0.0/0` does in IPv4) and any address starting with `0.0.0.0`. It works as intended for catching wide-open exports.
- `0.0.0.0/0` is syntactically accepted by exports but is, as the post correctly emphasizes, never a good idea.
- The post does not specify the NFS version; everything shown applies to both NFSv3 and NFSv4 on Linux nfs-utils, so this is fine.
