# Validation Summary: How to Conduct an IPv6 Security Assessment

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6 / Neighbor Discovery
- Nmap
- Scapy
- THC-IPv6 toolkit
- tcpdump
- dnsx
- fierce

## Sources Consulted
- Nmap Reference Guide, Target Specification: https://nmap.org/book/man-target-specification.html
- Nmap Reference Guide, IPv6 Scanning: https://nmap.org/book/port-scanning-ipv6.html
- Scapy IPv6 API reference: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- THC-IPv6 `fake_router6` man page: https://www.mankier.com/8/fake_router6
- ProjectDiscovery `dnsx` README / usage: https://github.com/projectdiscovery/dnsx
- `fierce` README / usage: https://github.com/mschwager/fierce
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 5095, Deprecation of Type 0 Routing Headers in IPv6: https://datatracker.ietf.org/doc/html/rfc5095
- RFC 6946, Processing of IPv6 "Atomic" Fragments: https://datatracker.ietf.org/doc/html/rfc6946
- RFC 7112, Implications of Oversized IPv6 Header Chains: https://datatracker.ietf.org/doc/html/rfc7112
- RFC 8201, Path MTU Discovery for IP version 6: https://datatracker.ietf.org/doc/html/rfc8201
- Local CLI help checked for `ping`, `tracepath`, and `tcpdump`

## Issues Found
- The passive-discovery `tcpdump` example filtered on output text (`NS|NA|RS|RA`) that is not a reliable way to isolate NDP traffic. I changed it to a BPF filter for ICMPv6 Neighbor Discovery message types 133-136.
- The post used `ping6`; current `iputils` documents `ping -6`. I updated both ping examples to the documented current form.
- The first Nmap host-discovery example used an IPv6 octet-range form (`::1-ff`) that Nmap does not support for IPv6 targets. I changed it to CIDR form (`/120`), which Nmap documents for IPv6.
- The second Nmap host-discovery example used shorthand comma-separated targets that would not expand to the intended prefix. I replaced it with explicit IPv6 targets.
- The dual-stack service-scan example targeted an entire `/64`, which is not a realistic way to scan discovered IPv6 hosts. I changed it to `-iL discovered-ipv6.txt`, matching Nmap’s documented target-list workflow.
- The DNS section mixed general host enumeration and AAAA-record querying. I corrected the `fierce` description to match its actual role and changed the `dnsx` example to the documented AAAA-query workflow (`dnsx -aaaa -resp` on input hostnames).
- Two IPv6 literals in the rogue RA section (`2001:db8:test::/64` and `2001:db8:attacker::`) were invalid because IPv6 hextets must be hexadecimal. I replaced them with valid documentation prefixes.
- The Scapy rogue-RA example did not use a link-local IPv6 source and omitted the source link-layer address option, both of which matter for Router Advertisements. I corrected the packet construction accordingly.
- The fragment test used invalid Scapy slicing on a packet object and described RFC 7112 incorrectly. I replaced it with a valid `fragment6()` example that actually creates a packet whose first fragment does not contain the full IPv6 header chain.
- The atomic-fragment example used `ICMP()` instead of an ICMPv6 payload. I changed it to `ICMPv6EchoRequest()`.
- The PMTUD section cited RFC 4821 and used an `hping3` example that did not correctly validate IPv6 Packet Too Big handling. I replaced it with `tracepath -6` and corrected the RFC reference to RFC 8201.

## Review Notes
- The RH0 test remains conceptually valid, but RFC 5095 deprecated Routing Header Type 0 long ago, so modern compliant stacks and middleboxes should drop it by default.
- The EUI-64 scan example is only practical when the assessor can narrow the interface-ID search space beyond the vendor OUI alone.
