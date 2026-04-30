# Validation Summary: How to Understand Why IPsec Is No Longer Mandatory in IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPsec
- AH
- ESP
- IKEv2
- strongSwan
- TLS
- QUIC

## Sources Consulted
- RFC 2460: Internet Protocol, Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc2460
- RFC 4294: IPv6 Node Requirements - https://www.rfc-editor.org/rfc/rfc4294.html
- RFC 4301: Security Architecture for the Internet Protocol - https://www.rfc-editor.org/rfc/rfc4301
- RFC 6434: IPv6 Node Requirements - https://www.rfc-editor.org/rfc/rfc6434
- RFC 3715: IPsec-Network Address Translation (NAT) Compatibility Requirements - https://www.rfc-editor.org/rfc/rfc3715
- RFC 3948: UDP Encapsulation of IPsec ESP Packets - https://www.rfc-editor.org/rfc/rfc3948
- RFC 7296: Internet Key Exchange Protocol Version 2 (IKEv2) - https://www.rfc-editor.org/rfc/rfc7296.html
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc8200
- RFC 8504: IPv6 Node Requirements - https://www.rfc-editor.org/rfc/rfc8504
- strongSwan `swanctl.conf` documentation - https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan configuration quickstart - https://docs.strongswan.org/docs/latest/config/quickstart.html
- strongSwan algorithm proposals documentation - https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan introduction/configuration docs - https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan IPsec protocol overview - https://docs.strongswan.org/docs/latest/howtos/ipsecProtocol.html

## Issues Found
- The post attributed the mandatory IPsec requirement and quoted language to RFC 2460. The explicit IPv6 node-level MUST requirements were stated in RFC 4294, while RFC 2460 only described IPv6 authentication/privacy capabilities and extension headers. I corrected the overview and historical section and replaced the quote with the actual RFC 4294 requirement text.
- The RFC 6434 section overstated the change as "SHOULD implement ESP; AH is now optional." RFC 6434 actually made support for the IPsec architecture a SHOULD for IPv6 nodes, while nodes that implement IPsec MUST implement ESP and MAY implement AH. I corrected the before/after summary and the closing summary text.
- The NAT section overclaimed common NAT64/NAT66 deployment as the reason IPsec ran into trouble. I tightened this to the verified point that NAT and translation in dual-stack and transition environments complicated deployment, while AH is incompatible with NAT and ESP typically relies on NAT-T when NAT is present.
- The strongSwan example used invalid IPv6 addresses, legacy `ipsec.conf` syntax, and outdated/incorrect proposal syntax for current strongSwan documentation. I replaced it with a current `swanctl.conf` example using valid IPv6 addresses, PSK authentication, transport mode, `start_action = trap`, and `esp_proposals = aes256gcm16`.
- The regulatory-compliance example implied specific frameworks require network-layer encryption. I softened this to accurately describe environments that choose network-layer encryption for internal or regulatory reasons.

## Review Notes
- RFC 8504 (January 2019) retains the RFC 6434 model: support for the IPsec architecture remains a SHOULD for IPv6 nodes, and nodes implementing IPsec must implement ESP and may implement AH.
- strongSwan still supports legacy `ipsec.conf`/`stroke` workflows, but current documentation treats `swanctl.conf` and the VICI-based tooling as the modern configuration path.
