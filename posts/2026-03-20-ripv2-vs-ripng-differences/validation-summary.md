# Validation Summary: How to Understand Differences Between RIPv2 and RIPng

## Status
validated

## Post Type
Technical comparison / guide

## Technologies Covered
- RIPv2
- RIPng
- IPv4 and IPv6 multicast
- IPsec
- FRRouting
- Cisco IOS / IOS XE RIP configuration
- Linux iproute2 multicast address inspection

## Sources Consulted
- RFC 2453 - RIP Version 2: https://datatracker.ietf.org/doc/html/rfc2453
- RFC 2080 - RIPng for IPv6: https://datatracker.ietf.org/doc/html/rfc2080
- RFC 4822 - RIPv2 Cryptographic Authentication: https://datatracker.ietf.org/doc/html/rfc4822
- RFC 1058 - Routing Information Protocol: https://datatracker.ietf.org/doc/html/rfc1058
- IANA IPv4 Multicast Address Space registry: https://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml
- FRRouting RIP documentation: https://docs.frrouting.org/en/latest/ripd.html
- FRRouting RIPng documentation: https://docs.frrouting.org/en/latest/ripngd.html
- FRRouting basic setup / daemons file documentation: https://docs.frrouting.org/en/stable-8.3/setup.html
- Cisco IOS RIP command reference: https://www.cisco.com/c/en/us/td/docs/ios/iproute_rip/command/reference/irr_book/irr_rip.html
- Cisco IOS IPv6 RIP command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i4.html
- Local iproute2 `ip -6 maddr help` output for `ip -6 maddr show dev eth0`

## Issues Found
- The comparison table hard-coded RIPv2 broadcast as `255.255.255.255 (old)`. RFC 2453 defines a RIPv1 compatibility mode where RIPv2 messages are broadcast, not a required specific broadcast address. Changed it to "RIPv1/RIPv2 compatibility broadcast."
- The RIPv2 authentication wording only mentioned plain text or MD5 in an RTE. Updated it to distinguish plain-text authentication from cryptographic authentication that uses the authentication slot plus a trailer, and noted RFC 4822 SHA-family algorithms.
- The FRRouting RIPng example used Cisco-style `ipv6 rip RIPNG enable`. FRR enables RIPng with `router ripng` plus `network IFNAME` or `network NETWORK`, so the example now uses `router ripng` and `network eth0`.
- The packet-size section incorrectly counted IPv4 and UDP headers inside RIP's 512-octet limit and claimed 484 bytes of payload equals 25 RTEs. Corrected it to 25 20-byte RTEs plus the 4-byte RIP header, within the 512-octet RIP message limit excluding IP and UDP headers.
- The RIPng packet-size wording implied the full IPv6 MTU is available for RTEs. Corrected it to the RFC 2080 MTU-derived calculation after IPv6, UDP, and RIPng headers.
- The FRRouting coexistence example enabled router modes but did not enable an interface. Added `network eth0` under both `router rip` and `router ripng`.
- Inline explanatory comments were placed after router commands in configuration snippets. Moved them to separate comment lines and marked the FRRouting snippet as text rather than shell.
- The summary referred to "protocol number" changes even though both protocols use UDP and the meaningful difference here is the UDP port and address family. Changed it to "UDP port and address changes."

## Review Notes
The Cisco snippets are interface-level fragments and assume surrounding configuration exists, such as a defined key chain for RIPv2 MD5 authentication, an enabled RIP process for IPv4, and IPv6 unicast routing for RIPng.
