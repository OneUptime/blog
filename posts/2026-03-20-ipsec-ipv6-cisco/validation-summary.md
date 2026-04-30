# Validation Summary: How to Configure IPsec IPv6 on Cisco Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- IPv6
- IPsec
- IKEv2
- Virtual Tunnel Interface (VTI)
- Crypto maps

## Sources Consulted
- Cisco IOS XE 17.x Security and VPN Configuration Guide, "IPv6 Virtual Tunnel Interface": https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/sec-vpn/b-security-vpn/m_ip6-ipsec-vti.html
- Cisco IOS XE 17.x Security and VPN Configuration Guide, "Configuring Internet Key Exchange Version 2": https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/sec-vpn/b-security-vpn/m_sec-cfg-ikev2-flex.html
- Cisco IOS IPv6 Command Reference, `match` command for IKEv2 policy/profile: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_09.html
- Cisco IOS Security Command Reference, `clear crypto ikev2 sa`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/a1/sec-a1-cr-book/sec-cr-c1.html
- Cisco IOS Security Command Reference, `show crypto ikev2 stats` and related IKEv2 show commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/s1/sec-s1-cr-book/sec-cr-s3.html
- Cisco IOS Debug Command Reference, `debug crypto ikev2` and `debug crypto isakmp`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/a1/db-a1-cr-book/db-c1.html
- Cisco Support, "Implementing IKEv2 Route-Based Site-to-Site VPN on Cisco Routers Using IPv6": https://www.cisco.com/c/en/us/support/docs/security-vpn/internet-security-association-key-management-protocol-isakmp/223291-implementing-ikev2-route-based-site-to.pdf
- Cisco Next Generation Cryptography guidelines for IPsec transforms: https://sec.cloudapps.cisco.com/security/center/resources/next_generation_cryptography
- RFC 7296, Internet Key Exchange Protocol Version 2 (IKEv2): https://www.rfc-editor.org/rfc/rfc7296.html

## Issues Found
- The post used invalid IPv6 examples such as `2001:db8:gw1::1`, `2001:db8:vti::1/64`, and `2001:db8:site2::/48`. These are not syntactically valid IPv6 addresses or prefixes, so I replaced them with valid documentation-prefix examples.
- The IKEv2 keyring peer `address` entries omitted the required IPv6 prefix length. Cisco's IKEv2 keyring syntax for IPv6 peers requires an address and prefix, so I corrected those entries to `/128` host matches.
- The IKEv2 profile `match identity remote address` lines also omitted the required IPv6 prefix length. I added `/128` so the examples match Cisco's documented IKEv2 profile syntax.
- The configuration omitted `ipv6 unicast-routing`, which is required for routed IPv6 forwarding on Cisco IOS/IOS XE. I added it to the configuration example.
- The `show crypto ipsec sa` sample output showed site-specific selectors for a VTI example. Cisco's IPv6 VTI examples show wildcard traffic selectors (`::/0/0/0`) for route-based tunnels, so I corrected the representative sample output.
- The troubleshooting section used `debug crypto isakmp` and `clear crypto ikev2 session`. For IKEv2, Cisco documents `debug crypto ikev2` subcommands and `clear crypto ikev2 sa`, so I replaced those commands with the correct IKEv2 forms.
- The legacy IPv6 crypto map example used `crypto map IPV6-CMAP 10 ipsec-isakmp`. Cisco documents IPv6 crypto maps with the `crypto map ipv6 ...` form, so I corrected that syntax.
- The summary implied UDP 4500 is always required. I clarified that UDP 500 and ESP are the baseline requirements, while UDP 4500 is only needed when NAT-T or UDP encapsulation is used.

## Review Notes
The post is now technically sound for a Cisco IOS / IOS XE IKEv2 IPv6 site-to-site example using IPsec VTIs. Exact command availability and verification output can still vary somewhat by platform and software release, and the VTI approach shown assumes a release that supports `tunnel mode ipsec ipv6`; older releases may need the legacy crypto map method shown later in the post.
