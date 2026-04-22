# Validation Summary: How to Understand SLAAC Security Risks

## Status
validated

## Post Type
Security guide / Reference

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- IPv6 Neighbor Discovery Protocol (NDP)
- Router Advertisements (RA), Prefix Information options, and RA flags
- DHCPv6 and DHCPv6 Guard / DHCPv6-Shield
- RA Guard, IPv6 ND Inspection, IPv6 Source Guard, and IPv6 snooping
- Modified EUI-64 interface identifiers, RFC 7217 stable privacy addresses, and temporary privacy addresses
- Linux IPv6 `use_tempaddr` sysctl

## Sources Consulted
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 3756: IPv6 Neighbor Discovery Trust Models and Threats - https://datatracker.ietf.org/doc/html/rfc3756
- RFC 6104: Rogue IPv6 Router Advertisement Problem Statement - https://datatracker.ietf.org/doc/rfc6104/
- RFC 6105: IPv6 Router Advertisement Guard - https://datatracker.ietf.org/doc/html/rfc6105
- RFC 7113: Implementation Advice for IPv6 Router Advertisement Guard - https://datatracker.ietf.org/doc/html/rfc7113
- RFC 7610: DHCPv6-Shield - https://datatracker.ietf.org/doc/html/rfc7610
- RFC 7217: Stable and Opaque IIDs with SLAAC - https://www.rfc-editor.org/rfc/rfc7217.html
- RFC 8064: Recommendation on Stable IPv6 Interface Identifiers - https://www.rfc-editor.org/rfc/rfc8064.html
- RFC 7707: Network Reconnaissance in IPv6 Networks - https://www.rfc-editor.org/rfc/rfc7707.html
- RFC 8981: Temporary Address Extensions for SLAAC - https://datatracker.ietf.org/doc/html/rfc8981
- Linux Kernel IP Sysctl documentation - https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Cisco IOS XE 17 FHS and SISF Configuration Guide: IPv6 First-Hop Security - https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/ipv6-first-hop-security.html
- Cisco IPv6 Neighbor Discovery Inspection documentation - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/15-sy/ip6-nd-inspect.html
- Cisco DHCP for IPv6 documentation - https://www.cisco.com/c/en/us/td/docs/routers/asr920/configuration/guide/ipaddr-dhcp/dhcp-xe-3-13-asr920-book/m_ip6-dhcp.pdf

## Issues Found
- **Router Advertisement default-router semantics**: The post described an RA as carrying `gateway=attacker` and implied all hosts and all traffic would switch to the attacker. RFC 4861 makes the RA source address, with nonzero Router Lifetime, the default-router candidate. Updated the text to say accepting hosts add the attacker's link-local source address to the default router list and that off-link traffic may flow through the attacker.
- **RouterLifetime=0 DoS details**: The post implied any attacker could send a zero-lifetime RA "for" the legitimate router. A host removes the router entry associated with the RA source, so the attack requires spoofing the legitimate router's RA/source. Updated the wording accordingly.
- **Prefix hijacking behavior**: The post implied that advertising a wrong prefix alone routes traffic through the attacker. SLAAC address generation comes from Prefix Information options with the Autonomous flag, while default routing still depends on RA default-router behavior. Updated the prefix-hijacking example to include the A flag and clarify that routing through the attacker requires the attacker to also be a default router.
- **EUI-64 terminology and privacy controls**: The post used "EUI-64" generically and listed `use_tempaddr=2` as if it were universal. Updated this to "Modified EUI-64 SLAAC addresses" and clarified that `use_tempaddr=2` is the Linux control while other clients need their OS-specific private or temporary addressing setting.
- **Tracking claims**: The post overstated DHCP logging as tracing directly to a user and stateful DHCPv6 as full address-to-identity tracking. Updated the wording to MAC/device tracking for DHCPv4 and address-to-client lease records for DHCPv6, with RADIUS/802.1X providing user identity correlation.
- **ND Inspection versus IPFIX**: The post paired IPv6 ND Inspection with IPFIX as if both produced the same switch binding table. ND Inspection / IPv6 snooping builds the binding table; IPFIX can be useful telemetry but is not the same control. Changed the mitigation to IPv6 ND Inspection / IPv6 snooping.
- **Temporary address lifetime**: The post said privacy-extension addresses change daily. RFC 8981 and Linux defaults support "often daily" preferred lifetimes, but behavior is implementation and configuration dependent. Updated the text to "changes periodically (often daily by default)."
- **DHCPv6 default gateway claim**: The post said a rogue DHCPv6 server can assign a gateway. DHCPv6 does not provide the IPv6 default gateway; hosts learn default routers from RAs. Updated the attack description so DHCPv6 supplies address/DNS while the rogue router supplies the default gateway.
- **RA M flag behavior**: The post stated that hosts send DHCPv6 SOLICIT when M=1. RFC 4861 defines M=1 as indicating addresses are available via DHCPv6, but host behavior can vary. Updated the wording to "hosts that honor the flag."
- **Neighbor Discovery spoofing wording**: The post title referred to Neighbor Solicitation spoofing while the content discussed Neighbor Advertisement spoofing. RFC 3756 covers both NS and NA spoofing. Updated the section to "Neighbor Discovery Spoofing Against Predictable Addresses" and clarified how predictable SLAAC addresses make targeting easier.

## Review Notes
- RA Guard, DHCPv6 Guard, ND Inspection, and IPv6 Source Guard are valid mitigations, but feature names and capabilities are vendor and platform specific.
- RFC 7113 notes that RA Guard implementations must handle IPv6 extension headers and fragmentation correctly; older or limited implementations may be bypassable.
- Modern hosts often use RFC 7217-style stable opaque identifiers and/or temporary addresses by default, so the Modified EUI-64 risks mainly apply when that address-generation mode is enabled or used by legacy devices.
