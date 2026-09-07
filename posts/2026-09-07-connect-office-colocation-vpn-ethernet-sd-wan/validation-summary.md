# Validation Summary: How to Connect an Office to Colocation with VPN, Ethernet, or SD-WAN

## Status

validated

## Post Type

Technical design and acceptance-testing guide. Although it contains no executable code, commands, or configuration, it includes technical implementation details about routing, redundant edge devices, tunnel MTU, and failure testing and therefore merits technical validation.

## Technologies Covered

- Site-to-site IPsec VPNs, IKE, NAT traversal, and key lifecycle management
- Carrier Ethernet, Metro Ethernet, E-Line, VLAN handoffs, and Layer 2 service boundaries
- SD-WAN overlays, underlay connectivity, application policies, and controller resilience
- IPv4, IPv6, routing, path MTU, and encapsulation
- WAN sizing, redundant access, independent management, and acceptance testing

## Sources Consulted

- [NIST SP 800-77 Rev. 1: Guide to IPsec VPNs](https://www.nist.gov/publications/guide-ipsec-vpns): confirms the publication identity and the description of IPsec and IKE.
- [MEF/Mplify Carrier Ethernet service standards](https://www.mplify.net/service-standards/underlay-services/carrier-ethernet/): confirms Layer 2 services, point-to-point E-Line connectivity, and references to subscriber service definitions and attributes.
- [MEF/Mplify SD-WAN service standards](https://www.mplify.net/service-standards/overlay-services/sd-wan/): confirms overlay/underlay separation, application-flow classification, policy enforcement, and service demarcation.
- [Cisco Catalyst SD-WAN Design Guide](https://www.cisco.com/c/en/us/td/docs/solutions/CVD/SDWAN/cisco-sdwan-design-guide.pdf): checked application-aware routing, encrypted transport, path monitoring, controller-loss considerations, and edge sizing.
- [RFC 4301: Security Architecture for the Internet Protocol](https://www.rfc-editor.org/rfc/rfc4301): checked IPsec protection and section 8.2 PMTU handling, including encapsulation overhead.
- [RFC 7296: Internet Key Exchange Protocol Version 2](https://www.rfc-editor.org/rfc/rfc7296): checked authentication, rekeying, and NAT traversal considerations.
- [RFC 5880: Bidirectional Forwarding Detection](https://www.rfc-editor.org/rfc/rfc5880): checked forwarding-path failure detection independently of physical carrier state.
- [Author GitHub profile](https://github.com/nawazdhandala): verified the author link resolves to the named profile; not used as technical evidence.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. There are no executable examples, CLI flags, configuration fields, or product-version-specific instructions to test.
- The workload inventory, failover capacity, independent power/access, management access, and cost items are reasonable engineering recommendations. Actual bandwidth, latency, recovery, availability, and pricing require site-specific measurements and provider commitments; the post does not promise universal values.
- Carrier Ethernet privacy does not itself guarantee encryption. The post correctly treats encryption as a separate requirement and avoids assuming that a Layer 2 service must extend the office broadcast domain.
- SD-WAN path steering does not increase an individual circuit's physical capacity. Optimization or use of multiple links can improve effective application performance without contradicting this claim. Shared physical access remains a common failure dependency.
- The MTU expression is a conceptual encapsulation budget. In context, payload means the inner packet carried by the tunnel, not application data alone, and the underlay MTU must reflect the limiting path. Actual overhead includes applicable headers, authentication data, and padding; the surrounding instruction to discover and test it is appropriate.
- The acceptance plan appropriately includes application recovery and forwarding failures with carrier still up. This was a documentation review; no physical network, gateway benchmark, or failover experiment was available or executed.
- All four official-documentation links resolve to the intended resources. The MEF URLs redirect to Mplify, whose site identifies itself as formerly MEF Forum and retains the cited MEF standards. Those redirects do not require a technical correction. The author link also resolves correctly.
