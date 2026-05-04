# Validation Summary: How to Configure PAT (Port Address Translation) for IPv4 Address Conservation

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- PAT (Port Address Translation) / NAT overload / IP masquerading
- Linux iptables (nat table, MASQUERADE and SNAT targets)
- Linux nftables (nat and filter tables)
- Linux sysctl (`net.ipv4.ip_forward`)
- Cisco IOS NAT configuration (interface modes, ACLs, `ip nat inside source list ... overload`)
- conntrack-tools / `/proc/net/nf_conntrack`

## Sources Consulted
- iptables-extensions(8) man page (MASQUERADE and SNAT targets)
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- nftables wiki: Configuring chains (priority values: srcnat=100, filter=0)
- conntrack(8) man page (`-n, --src-nat` flag)
- Cisco IOS NAT configuration guide: `ip nat inside source list ... overload` syntax
- Cisco IOS standard ACL wildcard mask conventions
- RFC 1918 (private address ranges) and RFC 2663/3022 (NAT/NAPT terminology)
- Linux kernel sysctl documentation for `net.ipv4.ip_forward`

## Issues Found
No technical issues found.

All technical content was verified:
- The iptables MASQUERADE and SNAT syntax is correct.
- The nftables ruleset uses valid syntax: `priority srcnat` (named alias for 100) for the nat chain, `priority 0` (equivalent to `filter`) for the forward chain, and proper `oifname/iifname` matching.
- The Cisco IOS configuration is syntactically correct, including interface NAT designations, the standard ACL with proper wildcard masks (192.168.0.0/16 → 0.0.255.255, 10.0.0.0/8 → 0.255.255.255, 172.16.0.0/12 → 0.15.255.255), and the `overload` keyword that converts NAT to PAT.
- The `conntrack -L -n` command correctly uses `-n` (`--src-nat`) to filter source-NATed (PAT) connections.
- The conceptual explanation of PAT multiplexing via unique source ports is accurate.
- The distinction between MASQUERADE (dynamic IPs) and SNAT (fixed IPs) is correctly stated.

## Review Notes
- The `iptables-save > /etc/iptables/rules.v4` path is the convention used by the `iptables-persistent` package on Debian/Ubuntu. Other distributions (e.g., RHEL/CentOS with firewalld, or systems using `iptables-services`) use different paths, but the post does not claim universality.
- The nftables example uses `priority srcnat` (named alias). This requires nftables 0.9.0+ (released 2019); older versions need numeric `priority 100`. This should be fine for any current Linux distribution.
- iptables itself is being phased out in favor of nftables on most modern distributions, but iptables commands continue to work via the `iptables-nft` shim. The post appropriately covers both.
- The `/proc/net/nf_conntrack` file requires the `nf_conntrack` kernel module to be loaded; on systems where conntrack is not in use, the file may not exist. This is an edge case worth mentioning in the future but not strictly an error.
