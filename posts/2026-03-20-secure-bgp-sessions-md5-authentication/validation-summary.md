# Validation Summary: How to Secure BGP Sessions with MD5 Authentication

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- BGP
- TCP MD5 Signature Option
- Cisco IOS and Cisco IOS XE
- FRRouting
- Generalized TTL Security Mechanism (GTSM)
- TCP Authentication Option (TCP-AO)

## Sources Consulted
- RFC 2385, Protection of BGP Sessions via the TCP MD5 Signature Option: https://datatracker.ietf.org/doc/html/rfc2385
- RFC 5082, The Generalized TTL Security Mechanism (GTSM): https://www.rfc-editor.org/rfc/rfc5082
- RFC 5925, The TCP Authentication Option: https://www.rfc-editor.org/rfc/rfc5925
- Cisco, Configure MD5 Authentication Between BGP Peers: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/112188-configure-md5-bgp-00.html
- Cisco IOS XE 17.x, BGP Support for TCP Authentication Option: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_bgp-support-for-tcp-ao.html
- Cisco IOS XE, TCP Authentication Option configuration: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/configuration/xe-16-12/iri-xe-16-12-book/tcp-ao.html
- Cisco IOS XE 17.x, Configuring Security with Passwords, Privileges, and Logins: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/sec-vpn/b-security-vpn/m_sec-cfg-sec-4cli-0.html
- Cisco, BGP Support for TTL Security Check: https://www.cisco.com/c/en/us/td/docs/ios/12_2sx/feature/guide/fsxebtsh.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html

## Issues Found
- The post said mismatched passwords make the TCP handshake fail silently. Cisco documents TCP MD5 authentication failure log messages such as BADAUTH, so the text now says the TCP connection cannot be made and that logging/debugging can show authentication failures.
- The verification example showed a non-authoritative `MD5 authentication enabled` line and said MD5 is negotiated. RFC 2385 states there is no negotiation, so the section now verifies local configuration with `show running-config` and peer compatibility with an Established BGP state.
- The Cisco type 6 storage note described type 6 as AES-256. Cisco IOS XE documentation describes type 6 as AES-based strong reversible storage, so the wording was corrected and the master key example was changed to the interactive form Cisco recommends.
- The FRRouting snippet was marked as Bash even though it is FRR/vtysh configuration. The code fence and comment style were changed to configuration text.
- The GTSM explanation said the expected incoming TTL is always 255 and that packets are dropped at the kernel. RFC 5082 and Cisco documentation describe sending with TTL 255 and accepting packets within the configured TTL range, so the explanation was corrected.
- The GTSM guidance referred to iBGP multihop. Cisco's BGP TTL security feature is documented for eBGP peerings, including multihop eBGP, so the wording now says multihop eBGP.
- The TCP-AO Cisco IOS XE sample omitted the `tcp` keyword on the key chain and the required `send-id` and `recv-id` key parameters. The sample now follows Cisco IOS XE TCP-AO key-chain syntax.
- The troubleshooting command used `show log` with a broad include pattern and suggested using plain telnet after MD5 was enabled. The command now uses `show logging | include BADAUTH`, and the telnet note clarifies that plain telnet is only a pre-MD5 reachability test because it does not include the TCP MD5 option.

## Review Notes
- RFC 2385 is obsoleted by RFC 5925 and calls TCP MD5 a weak but widely deployed mechanism. The article's recommendation to consider TCP-AO for new deployments is technically appropriate where platform support exists.
- Cisco command availability varies by platform and release, especially for TCP-AO and type 6 password storage. The article now qualifies those examples as supported-release/platform behavior.
