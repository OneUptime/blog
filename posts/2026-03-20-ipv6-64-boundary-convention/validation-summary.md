# Validation Summary: How to Understand the /64 Boundary Convention in IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- SLAAC
- IPv6 addressing and subnetting
- Linux `ip` command
- `radvd`
- Router Advertisements

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 6164, Using 127-Bit IPv6 Prefixes on Inter-Router Links: https://www.rfc-editor.org/rfc/rfc6164
- RFC 7217, A Method for Generating Semantically Opaque Interface Identifiers with IPv6 SLAAC: https://www.rfc-editor.org/rfc/rfc7217
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421
- RFC 7608, IPv6 Prefix Length Recommendation for Forwarding: https://www.rfc-editor.org/rfc/rfc7608
- RFC 8064, Recommendation on Stable IPv6 Interface Identifiers: https://www.rfc-editor.org/rfc/rfc8064
- `ip-address(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `radvd.conf(5)` manual page: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html

## Issues Found
- The description and introduction overstated `/64` as a universal IPv6 mandate for all subnets. I changed that wording to describe `/64` as the conventional prefix length for host-facing subnets and the required prefix length for SLAAC, which matches RFC 4862 and RFC 7608.
- The SLAAC explanation said a prefix "shorter than /64" breaks EUI-64 generation. That was backwards. I corrected it to "longer than /64" and fixed the malformed IID example, which had too many hextets for a 64-bit interface identifier.
- The `/80` `ip -6 addr add` example was presented as if the command itself were invalid and as if stateful DHCPv6 were mandatory afterward. I corrected the text to reflect that the Linux command syntax is valid, but such a prefix is unsuitable for a link that relies on SLAAC; static addressing or DHCPv6 are both possible alternatives.
- The `/127` point-to-point example used `2001:db8:ffff::0/127` and `::1/127`. RFC 6164 says addresses with all zeros in the rightmost 64 bits should not be assigned as unicast addresses in this context, so I changed the example to `::2/127` and `::3/127`.
- The explanation of the `/127` benefit conflated the ping-pong forwarding-loop issue with the subnet-router anycast reservation. I corrected the text to describe RFC 6164's actual rationale more accurately: mitigating the ping-pong issue and reducing the neighbor-cache attack surface.
- The IID-generation wording implied EUI-64 more strongly than current practice warrants. I updated it to note that EUI-64 is historical and that stable/private IID generation is also common, consistent with RFC 7217 and RFC 8064.

## Review Notes
- The Linux `ip` command examples are syntactically correct, and the `radvd.conf` snippet uses valid `AdvSendAdvert`, `AdvOnLink`, and `AdvAutonomous` syntax.
- Modern hosts commonly use stable opaque IIDs and temporary addresses rather than classic MAC-derived EUI-64 interface identifiers, but the post's retained EUI-64 example is still valid as an illustrative historical mechanism.
