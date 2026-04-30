# Validation Summary: How to Configure ip6tables to Allow Essential ICMPv6

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- IPv6
- ICMPv6
- ip6tables / netfilter
- Neighbor Discovery Protocol (NDP)
- Path MTU Discovery (PMTUD)
- RFC 4890 firewall filtering guidance

## Sources Consulted
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls" - https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://www.rfc-editor.org/rfc/rfc4861
- RFC 8201, "Path MTU Discovery for IP version 6" - https://www.rfc-editor.org/rfc/rfc8201
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc4443
- RFC 4291, "IP Version 6 Addressing Architecture" - https://www.rfc-editor.org/rfc/rfc4291
- `iptables-extensions(8)` ICMPv6 match documentation - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local `ip6tables -p icmpv6 -h` output from iptables v1.8.10
- Local `ping(8)` / iputils 20240117 documentation

## Issues Found
- The post incorrectly said all NDP types 133-137 should be allowed only from `fe80::/10`. I corrected the prose and rules because RFC 4861 allows Router Solicitation to use an assigned or unspecified source address, Neighbor Solicitation may use the unspecified address during Duplicate Address Detection, and Neighbor Advertisement is not limited to a link-local source. I updated the examples to validate NDP with Hop Limit 255 and to restrict only Router Advertisements to link-local source.
- The post treated Redirect (type 137) as a blanket "allow from link-local only" case. I corrected this to a policy decision, because RFC 4890 explicitly calls Redirect a case-by-case security choice and the example policy leaves it blocked by default.
- The example policy claimed RFC 4890 compliance while dropping forwarded Echo Request and Echo Reply. I added `FORWARD` rules for `echo-request` and `echo-reply` because RFC 4890 lists both as traffic that must not be dropped for transit traffic.
- The ICMPv6 type table described types 144-147 as "Home agent, BU". I corrected this to "Home agent discovery, mobile prefix" because Binding Update is not one of ICMPv6 types 144-147.
- The example section title overstated the policy as a complete RFC 4890 policy. I narrowed it to a perimeter-host example and noted that MLD handling is interface-specific on LANs.

## Review Notes
- The post uses `ping6` and `traceroute6`; these commands are still commonly available on Linux, though some systems prefer `ping -6` and `traceroute -6`.
- The final example is now scoped as a perimeter-host policy. Sites that carry multicast on LAN interfaces should add interface-specific MLD allowances before the final drop rules.
