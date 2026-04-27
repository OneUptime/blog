# Validation Summary: How to Understand Differences Between OSPFv2 and OSPFv3

## Status
validated

## Post Type
Reference / Comparison guide

## Technologies Covered
- OSPFv2 (RFC 2328)
- OSPFv3 (RFC 5340)
- IPv6 routing
- IPsec authentication for OSPFv3 (RFC 4552)
- OSPFv3 Address Families (RFC 5838)
- Cisco IOS OSPFv2 and OSPFv3 configuration
- FRRouting (FRR) ospfd and ospf6d configuration

## Sources Consulted
- RFC 2328 - OSPF Version 2 (https://www.rfc-editor.org/rfc/rfc2328)
- RFC 5340 - OSPF for IPv6 (https://www.rfc-editor.org/rfc/rfc5340)
- RFC 4552 - Authentication/Confidentiality for OSPFv3 (https://www.rfc-editor.org/rfc/rfc4552)
- RFC 5838 - Support of Address Families in OSPFv3 (https://www.rfc-editor.org/rfc/rfc5838)
- RFC 5709 - OSPFv2 HMAC-SHA Cryptographic Authentication
- RFC 7166 - Supporting Authentication Trailer for OSPFv3
- RFC 5250 - The OSPF Opaque LSA Option
- Cisco IOS IPv6 Configuration Guide - OSPFv3 commands
- FRRouting documentation - ospf6d (https://docs.frrouting.org/en/latest/ospf6d.html)

## Issues Found
No technical issues found. All RFC references, LSA type mappings, protocol behavior descriptions, and configuration syntax examples are accurate:

- RFC numbers (2328, 5340, 4552, 5838) match the cited specifications.
- OSPFv3 LSA function codes are correctly listed (Router=1, Network=2, Inter-Area Prefix=3, Inter-Area Router=4, AS External=5, Link=8, Intra-Area Prefix=9).
- The Instance ID field range (0-255) is correct for the 8-bit field defined in RFC 5340.
- Cisco IOS `ospfv3 authentication ipsec spi 256 sha1` syntax is valid; SPI minimum is 256.
- The interface-level dual-stack Cisco config (`ip ospf 1 area 0` + `ospfv3 1 ipv6 area 0`) is correct.
- Router ID behavior (must be set manually if no IPv4 address present) is accurate.
- fe80::/link-local neighbor formation behavior in OSPFv3 is correctly described.

## Review Notes
- **RFC 7166 (2014)** later added a native Authentication Trailer to OSPFv3 for environments where IPsec is impractical. The post's framing that OSPFv3 "removes [authentication] entirely and relies on IPsec" reflects the original RFC 5340/4552 design and is still substantively correct for the OSPFv2-vs-OSPFv3 architectural contrast, but readers deploying OSPFv3 today have the auth-trailer option as well.
- **OSPFv2 LSA Type 8** is technically defined as "External Attributes LSA" (RFC 5250 historical), but it is rarely used in practice, so labeling it "N/A" in the comparison table is reasonable shorthand.
- **OSPFv2 LSA Type 9** is the link-local-scope Opaque LSA (RFC 5250); the post's "Opaque" label is correct but slightly imprecise since OSPFv2 also has Type 10 (area scope) and Type 11 (AS scope) Opaque LSAs.
- **FRRouting ospf6d syntax**: The form `interface eth0 area 0.0.0.0` under `router ospf6` is the older configuration style. FRR 8.0+ deprecated this in favor of placing `ipv6 ospf6 area 0.0.0.0` under the interface block, though the older syntax remains functional in many builds for backwards compatibility.
- **OSPFv2 SHA authentication**: The "SHA" entry under built-in OSPFv2 authentication refers to HMAC-SHA cryptographic authentication added by RFC 5709, which is correct.
