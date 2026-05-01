# Validation Summary: How to Document IPv6 Compliance for Audits

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- Linux `iproute2` (`ip`, `ss`)
- `ip6tables`
- `nftables`
- DNS (`dig`, `resolv.conf`)
- Bash

## Sources Consulted
- `nft` man page: https://netfilter.org/projects/nftables/manpage.html
- `ip6tables` man page: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html
- `ip-neighbour` man page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- `ip-tunnel` man page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- BIND 9 `dig` manual: https://isc-projects.gitlab-pages.isc.org/bind9/manpages.html
- `resolv.conf` man page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://www.rfc-editor.org/rfc/rfc3596.html
- RFC 4443, ICMPv6 for IPv6 Specification: https://www.rfc-editor.org/rfc/rfc4443
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201

## Issues Found
- The nftables evidence command used `nft list ruleset ip6`, which excludes `inet` family tables that can also enforce IPv6 policy. I changed it to `nft list ruleset` and renamed the output file to capture the full relevant ruleset.
- The inventory script placed a comment before the shebang, which is incorrect if the snippet is saved as a script. I moved the shebang to the first line.
- The inventory script hardcoded `eth0` and `global` for every discovered address. I changed it to read the interface from `ip -6 neigh show` and derive scope from the address.
- The `DNS AAAA` column in the inventory script was populated with reverse-DNS PTR results instead of AAAA data. I changed it to query and record actual AAAA answers for resolved hostnames.
- The inventory script claimed to "scan" the network, but it actually reads the local IPv6 neighbor table. I corrected the comment to describe what the command really does.
- The tunnel verification example used `ip tunnel show` plus a plain `ip link show | grep ...`, which is incomplete for IPv6 tunnel inspection because `ip tunnel` defaults to IPv4 encapsulation and plain `ip link show` does not reliably expose tunnel types. I added `ip -6 tunnel show` and explicit `ip -d link show type ...` checks for common IPv6-related tunnel device types.
- The `Packet Too Big` verification used `ip6tables -L | grep "icmpv6.*too"`, which is not reliable because listed rules are commonly rendered as `ipv6-icmp` and may not match that pattern. I changed it to inspect `ip6tables -S` output for the explicit `--icmpv6-type packet-too-big` rule form.

## Review Notes
- The `ip6tables` examples remain valid for Linux systems using iptables-compatible workflows, including the `nf_tables` backend. Environments managed with native `nftables` rules should review `nft` output directly, which is why the evidence collection now captures the full nft ruleset.
- `ss -p` may require elevated privileges to show all owning processes.
