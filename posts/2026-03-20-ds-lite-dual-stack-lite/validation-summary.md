# Validation Summary: How to Understand DS-Lite (Dual-Stack Lite)

## Status
validated

## Post Type
Guide

## Technologies Covered
- DS-Lite (Dual-Stack Lite)
- IPv6 transition technologies / IPv4-as-a-service
- AFTR and B4 softwire architecture
- DHCPv6 AFTR-Name option
- Carrier-Grade NAT (CGN / NAT44)
- NAT64 and DNS64

## Sources Consulted
- RFC 6333: Dual-Stack Lite Broadband Deployments Following IPv4 Exhaustion - https://www.rfc-editor.org/rfc/rfc6333.html
- RFC 6334: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) Option for Dual-Stack Lite - https://www.rfc-editor.org/rfc/rfc6334
- RFC 9313: Pros and Cons of IPv6 Transition Technologies for IPv4-as-a-Service (IPv4aaS) - https://www.ietf.org/rfc/rfc9313.html
- RFC 6146: Stateful NAT64: Network Address and Protocol Translation from IPv6 Clients to IPv4 Servers - https://www.rfc-editor.org/info/rfc6146
- RFC 6147: DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers - https://www.rfc-editor.org/info/rfc6147

## Issues Found
- The packet-flow and AFTR discovery text implied that DHCPv6 option 64 directly carries an AFTR IPv6 address. I corrected this to explain that `OPTION_AFTR_NAME` carries an FQDN, which the B4 resolves in DNS, or that the AFTR can be provisioned manually. This matches RFC 6334 and RFC 6333.
- The NAT64 comparison table said DNS64 is "required." I changed this to "DNS64 typically used" because NAT64 is commonly deployed with DNS64, but that wording is more accurate and better aligned with RFC 6146, RFC 6147, and RFC 9313.
- The MTU section said the B4 must set the IPv4 MTU to 1460. I corrected this to the RFC 6333 behavior: providers can increase the MTU between the B4 and AFTR by at least 40 bytes, and if they do not, fragmentation and reassembly must happen at the tunnel endpoints after encapsulation.
- The limitations section incorrectly referred to "double encapsulation." I changed this to "encapsulation and centralized NAT" because DS-Lite uses IPv4-in-IPv6 encapsulation plus NAT44 at the AFTR, not double encapsulation.
- The limitations section said subscribers cannot get a fixed public IPv4 address. I changed this to the technically accurate default behavior that subscribers usually share public IPv4 addresses behind CGN, because the original wording was too absolute.
- The deployment section named specific ISP examples and asserted per-subscriber `/56` or `/64` prefix sizing as typical DS-Lite behavior. I replaced that with RFC-backed general deployment wording because the original phrasing was more operationally specific than the standards text supports.

## Review Notes
- The post is a technical explainer rather than a hands-on tutorial, so there were no executable code samples or CLI commands to validate.
- The article focuses on the common gateway-based DS-Lite model. RFC 6333 also describes host-based B4 deployments, but leaving that out is acceptable for an introductory overview.
