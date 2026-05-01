# Validation Summary: How to Disable IPv4 Source Routing for Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel networking
- IPv4
- IP source routing (`LSRR`, `SSRR`)
- `sysctl`
- `nftables`
- `nping`
- `tcpdump`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html
- Nping reference guide: https://nmap.org/book/nping-man.html
- Nping project page: https://nmap.org/nping/
- nftables quick reference: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- OpenSCAP Security Guide for Ubuntu 20.04 CIS Level 1 Server: https://static.open-scap.org/ssg-guides/ssg-ubuntu2004-guide-cis_level1_server.html
- Current `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local command help in the review environment: `sysctl --help`, `nft describe ip hdrlength`, `iptables -m ipv4options -h`

## Issues Found
- The introduction said IPv4 source routing lets the sender specify the exact route a packet takes. RFC 791 distinguishes loose source routing from strict source routing, so I corrected this to "part or all of the route."
- The security explanation overstated the behavior of source routing with examples like traffic appearing from an allowed IP. I reworded the risk description to match RFC behavior and current hardening guidance.
- The runtime sysctl example hard-coded `eth0`, which is not a safe assumption on current Linux systems. I replaced it with a loop that applies the setting to all currently present interfaces.
- The firewall section used `iptables -m ipv4options`, which is not documented in the current standard `iptables-extensions(8)` manual and failed in the local review environment. I replaced that legacy guidance with a current `nftables` defense-in-depth example that drops IPv4 packets carrying IP options.
- The optional verification section used `hping3 --lsrr`, which I could not validate from current documentation. I replaced it with documented `nping --ip-options` syntax from the official Nmap/Nping reference.
- The `tcpdump` note implied that seeing or not seeing the packet on the target directly proves kernel acceptance. I corrected the wording so the capture is used to confirm the packet carries IPv4 options, while lack of reply is the expected signal from the protected host.
- The compliance section used overly specific CIS/STIG identifiers without stable cross-distribution context. I generalized that guidance to accurate framework-level statements backed by OpenSCAP references.
- The conclusion claimed zero impact and described the setting as mandatory for every production system. Linux kernel and OpenSCAP guidance allow for rare legitimate uses, so I softened that claim.

## Review Notes
- Linux documents `net.ipv4.conf.*.accept_source_route` as `FALSE` by default for hosts and `TRUE` by default for routers, so many non-routing hosts already have this disabled. Setting it explicitly is still a reasonable hardening measure.
- The firewall example now uses `nftables` because that is the current Linux firewall framework with documented support for matching IPv4 header length. It is intentionally broader than matching only `LSRR` and `SSRR`, because it drops any IPv4 packet with header options.
