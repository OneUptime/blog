# Validation Summary: How to Understand ARP Flux on Multi-Homed Linux Hosts

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux IPv4 networking
- Address Resolution Protocol (ARP)
- Linux kernel IPv4 neighbor/ARP sysctls (`arp_ignore`, `arp_announce`, `arp_filter`)
- Multi-homed Linux hosts
- Source-based policy routing

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 5227 — IPv4 Address Conflict Detection: https://www.rfc-editor.org/rfc/rfc5227
- Local `sysctl --help` output on the review machine to verify current `sysctl -w` and `sysctl -p/--load` command syntax

## Issues Found
- The introduction called ARP flux "ARP gratuitous confusion." I removed that wording because it conflated ARP flux with gratuitous ARP / ARP Announcement terminology covered in RFC 5227.
- The example used interfaces on different subnets, which is less representative of the classic ARP flux case described in the kernel documentation. I changed it to a same-subnet multi-interface example so the failure mode matches the documented behavior more closely.
- The `arp_ignore` table incorrectly summarized values `3-8` as generic restrictive modes. I corrected it to match the kernel docs: `3` skips host-scope local addresses, `4-7` are reserved, and `8` disables replies for all local addresses.
- The `arp_announce=2` explanation was too absolute. I changed it to reflect the kernel definition: Linux chooses the best local address for the target, typically one from the outgoing interface's subnet, rather than always using that interface's address.
- The global `arp_ignore` note was imprecise. I updated it to reflect the kernel rule that the effective value is the maximum of `conf/all` and `conf/<interface>`.
- The `arp_filter` comment and affected-scenarios list were tightened to match the kernel docs, which describe it as useful when multiple interfaces share a subnet and when source-based policy routing is configured.
- The persistent configuration snippet used shell redirection with `cat >> /etc/sysctl.conf` and no privilege on the redirection itself. I changed it to `sudo tee -a /etc/sysctl.conf` so the command works as written for non-root shells.

## Review Notes
- `arp_filter=1` is situational. The Linux kernel documentation explicitly ties it to setups with multiple interfaces on the same subnet and to routing that returns traffic through the receiving interface.
- This post is correctly scoped to IPv4. IPv6 uses Neighbor Discovery rather than ARP, so these sysctls do not apply there.
