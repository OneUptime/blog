# Validation Summary: How to Understand MAP-T (Mapping of Address and Port using Translation)

## Status
validated

## Post Type
Guide

## Technologies Covered
- MAP-T
- MAP-E
- DS-Lite
- DHCPv6 MAP provisioning
- Stateless IPv4/IPv6 translation
- IPv4-embedded IPv6 addressing

## Sources Consulted
- RFC 7599, Mapping of Address and Port using Translation (MAP-T): https://www.rfc-editor.org/rfc/rfc7599
- RFC 7598, DHCPv6 Options for Configuration of Softwire Address and Port-Mapped Clients: https://www.rfc-editor.org/rfc/rfc7598
- RFC 7597, Mapping of Address and Port with Encapsulation (MAP-E): https://www.rfc-editor.org/rfc/rfc7597
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052
- RFC 6145, IP/ICMP Translation Algorithm: https://www.rfc-editor.org/rfc/rfc6145
- RFC 6333, Dual-Stack Lite Broadband Deployments Following IPv4 Exhaustion: https://www.rfc-editor.org/rfc/rfc6333

## Issues Found
- The comparison table described MAP-T as "IPv6 header translation". I changed this to "IPv4/IPv6 translation" because MAP-T translates between IPv4 and IPv6 headers, as defined by RFC 7599 and RFC 6145.
- The MAP-T provisioning section implied that each MAP rule includes a BR address. I corrected this to MAP-T domain parameters that include MAP rules, optional port parameters, and a DMR IPv6 prefix, because RFC 7598 defines MAP-T with rule and DMR options rather than the BR-address option used by MAP-E.
- The port-sharing example showed contiguous per-subscriber blocks such as `1024-2047`. I replaced that with repeating port sets that match the MAP PSID algorithm and the default PSID-offset behavior illustrated in RFC 7597.
- The address-synthesis section said the BR could compute the "IPv4 destination" from the IPv6 source. I corrected this to the subscriber's mapped IPv4 address and port set, which is what the MAP-T algorithm actually derives from the source-side MAP information.
- The packet-flow example skipped the CE's NAPT44 stage and showed the LAN device originating traffic directly from the shared public IPv4 address. I updated the flow to show private IPv4 on the LAN, NAPT44 on the CE, then RFC 6145 translation plus MAP address synthesis.
- The DMR section described the DMR as using the NAT64 well-known prefix or a BR address. I corrected this to the BR IPv6 prefix used to synthesize IPv4-embedded IPv6 destinations per RFC 6052, including RFC 7599's default `/64` guidance and `/96` maximum.
- The limitations section said "GRE, ICMP need special handling". I replaced that with ICMP and fragmentation handling, because those behaviors are explicitly specified in RFC 7599 and RFC 6145, while the GRE wording was too broad and not supported by the cited standards.
- Several remaining "port range" phrases were tightened to "port set" where MAP terminology required that precision.

## Review Notes
- RFC 7599 does not require DHCPv6 as the only provisioning mechanism. It recommends DHCPv6 option support, but also allows other provisioning methods such as TR-69, NETCONF, or manual configuration.
- The post remains technically relevant. MAP-T and its related DHCPv6 options are still current Standards Track RFCs rather than deprecated material.
