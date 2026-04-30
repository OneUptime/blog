# Validation Summary: How to Understand ICMP in IPv4 vs ICMPv6 Differences

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMP
- ICMPv6
- IPv4
- IPv6
- Linux `ping` / `ping -6`
- Linux `ip6tables`

## Sources Consulted
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://www.rfc-editor.org/rfc/rfc4862
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls" - https://www.rfc-editor.org/rfc/rfc4890
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200
- RFC 1256, "ICMP Router Discovery Messages" - https://www.rfc-editor.org/rfc/rfc1256
- IANA ICMP Parameters registry - https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml
- IANA ICMPv6 Parameters registry - https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Local `ping(8)` man page from iputils
- Local `ip6tables -p icmpv6 -h` help output

## Issues Found
- The post stated that IPv4 router discovery was only partial and listed no ICMPv4 Router Solicitation or Router Advertisement types. I corrected the comparison to reflect RFC 1256 and the IANA ICMP registry: ICMPv4 Router Advertisement is Type 9 and Router Solicitation is Type 10.
- The IPv6 explanation overstated the effect of blocking Router Solicitation and Router Advertisement by saying hosts could not get IPv6 addresses at all. I narrowed this to the accurate behavior from RFC 4862: blocking them breaks SLAAC and automatic prefix/default-router learning, while DHCPv6 or static addressing may still exist.
- The example commands used `ping6`. Current iputils documentation treats IPv6 ping as `ping -6`, with `ping6` only as a compatibility symlink where present, so I updated the commands to the current syntax.
- The firewall example omitted ICMPv6 `parameter-problem`, which RFC 4890 classifies with the core error messages that should not be dropped for normal IPv6 operation. I added that rule and updated the concluding recommendation accordingly.
- The Neighbor Discovery comments were slightly too broad. I tightened the wording so the post now says these messages carry key NDP functions and that blocking NS/NA breaks on-link link-layer address resolution and local IPv6 communication.

## Review Notes
- The `ip6tables` syntax in the post is valid on current Linux systems, including the nftables-backed `ip6tables` frontend.
- The `fe80::1%eth0` example is syntactically correct because link-local IPv6 destinations require an interface scope, but it remains an example address and must match a real local neighbor to succeed.
