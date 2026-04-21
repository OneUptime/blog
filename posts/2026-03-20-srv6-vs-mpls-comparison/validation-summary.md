# Validation Summary: How to Understand SRv6 vs MPLS Comparison

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MPLS
- SR-MPLS
- SRv6
- Segment Routing Header (SRH)
- SR Policy and BGP SR Policy
- MPLS L3VPN and EVPN/VPLS
- SRv6 BGP overlay services
- MPLS and SRv6 OAM/BFD
- SRv6 compressed SID list encoding / uSID / NEXT-CSID
- Python

## Sources Consulted
- RFC 3032: MPLS Label Stack Encoding - https://www.rfc-editor.org/rfc/rfc3032
- RFC 4364: BGP/MPLS IP Virtual Private Networks (VPNs) - https://www.rfc-editor.org/rfc/rfc4364
- RFC 5884: Bidirectional Forwarding Detection (BFD) for MPLS Label Switched Paths (LSPs) - https://www.rfc-editor.org/rfc/rfc5884
- RFC 8402: Segment Routing Architecture - https://www.rfc-editor.org/rfc/rfc8402
- RFC 8754: IPv6 Segment Routing Header (SRH) - https://www.rfc-editor.org/rfc/rfc8754
- RFC 8986: Segment Routing over IPv6 (SRv6) Network Programming - https://www.rfc-editor.org/rfc/rfc8986
- RFC 9252: BGP Overlay Services Based on Segment Routing over IPv6 (SRv6) - https://www.rfc-editor.org/rfc/rfc9252
- RFC 9256: Segment Routing Policy Architecture - https://www.rfc-editor.org/rfc/rfc9256
- RFC 9259: Operations, Administration, and Maintenance (OAM) in Segment Routing over IPv6 (SRv6) - https://www.rfc-editor.org/rfc/rfc9259
- RFC 9800: Compressed SRv6 Segment List Encoding - https://www.rfc-editor.org/rfc/rfc9800
- RFC 9830: Advertising Segment Routing Policies in BGP - https://www.rfc-editor.org/rfc/rfc9830
- Python Language Reference - https://docs.python.org/3/reference/
- Python typing documentation - https://docs.python.org/3/library/typing.html

## Issues Found
- SRv6 overhead was simplified as "40 bytes base + 16 bytes/SID" without the fixed 8-byte SRH cost. Updated the table and code comments to distinguish outer IPv6 overhead, SRH fixed fields, SID entries, and the case where a single-SID SRv6 path can omit SRH.
- The SRv6 data-plane diagram implied SRH is always present. Updated it to "IPv6 DA/SRH" to reflect that the active SID is carried in the IPv6 destination address and SRH may be omitted for a single segment.
- The MPLS overhead example mixed L3VPN wording with VC terminology. Reworded it as a generic MPLS VPN/service stack with three 4-byte label entries.
- SR Policy was described as simply "stateless". Updated this to state that SR Policy maintains state at the headend while avoiding per-flow state in the core.
- OAM/BFD was described as "IPv6 BFD (standard)" for SRv6. Updated this to reference SRv6 OAM with ICMPv6/UDP ping/traceroute and BFD applicability.
- The migration section said SR-MPLS uses the same control plane as SRv6. Updated this to "similar control-plane model" with data-plane-specific SID advertisements.
- uSID compression was described as reducing overhead to near-MPLS levels. Updated this to align with RFC 9800 terminology by referring to uSID/NEXT-CSID compression and avoiding an overbroad near-MPLS claim.
- Hardware support and deployment recommendations used vendor-specific or overly broad wording. Reworded them to stay accurate without implying universal SRv6 hardware availability or a one-size-fits-all recommendation.

## Review Notes
The embedded Python example was executed successfully with Python 3 and produced the expected overhead calculations. The post is now technically accurate at a guide level, but future updates could add more nuance around reduced SRH encoding and platform-specific SRv6/uSID hardware support.
