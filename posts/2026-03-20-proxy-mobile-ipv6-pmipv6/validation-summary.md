# Validation Summary: How to Understand Proxy Mobile IPv6 (PMIPv6)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Proxy Mobile IPv6 (PMIPv6)
- Mobile IPv6 (MIPv6)
- IPv6 mobility and tunneling
- AAA / RADIUS for mobility policy
- LTE / EPC mobility architecture
- Python illustrative networking logic
- OpenAirInterface (historical PMIPv6 implementation on UMIP)

## Sources Consulted
- RFC 5213: Proxy Mobile IPv6 — https://datatracker.ietf.org/doc/rfc5213/
- IANA Mobility Parameters Registry — https://www.iana.org/assignments/mobility-parameters/mobility-parameters.xhtml
- RFC 6275: Mobility Support in IPv6 — https://www.rfc-editor.org/rfc/rfc6275.html
- RFC 6572: RADIUS Support for Proxy Mobile IPv6 — https://www.rfc-editor.org/rfc/rfc6572.html
- 3GPP TS 29.275 specification details: Proxy Mobile IPv6 (PMIPv6) based Mobility and Tunnelling protocols; Stage 3 — https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=1693
- 3GPP TS 23.402 specification details: Architecture enhancements for non-3GPP accesses — https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=850
- OpenAirInterface Proxy Mobile IPv6 (historical OAI PMIPv6 page) — https://openairinterface.eurecom.fr/openairinterface-proxy-mobile-ipv6-oai-pmipv6

## Issues Found
- The post listed the wrong Mobility Header type numbers for PMIPv6. I corrected PBU from MH Type 3 to MH Type 5 and PBA from MH Type 4 to MH Type 6, matching the standard Binding Update / Binding Acknowledgement types with the PMIPv6 `P` flag.
- The PBA option example was incorrect. I removed the invalid `IPv6 Home Address Option` reference and replaced it with options RFC 5213 actually uses for a Proxy Binding Acknowledgement, including Mobile Node Identifier and Home Network Prefix handling.
- The tunnel description implied GRE as the default/base behavior. I updated the architecture and MAG text to match RFC 5213's base specification, which uses a bi-directional MAG-LMA tunnel with IPv6-in-IPv6 encapsulation in the IPv6 case.
- The post overstated PMIPv6 as the standard for LTE/4G/5G mobile cores. I narrowed the wording to network-based localized mobility and some LTE/EPC architectures, which is what the cited 3GPP material supports.
- The PBU example omitted the required ordering state. I added that a valid Sequence Number or Timestamp is required for ordering.
- The Linux install/config section used an unverified `umip-pmip` package and a generic config snippet that did not match the official historical OAI documentation. I replaced that block with a historically accurate note that OAI PMIPv6 was implemented as project-specific patches on top of UMIP 0.4.
- The Python snippet had a misleading access technology type (`str`) and a bare forward reference in a type annotation. I changed the access technology type to `int`, quoted the `ProxyBindingAck` annotation, and removed the GRE-specific tunnel comment.

## Review Notes
- The Python section remains an illustrative sketch, not a complete RFC 5213 implementation. Real PMIPv6 MAG/LMA implementations also need full sequence/timestamp handling, IPsec protection for signaling, and complete binding/tunnel lifecycle management.
- The OAI PMIPv6 material available from the official project site is historical. It is not appropriate to present it as a current generic distro package installation flow.
