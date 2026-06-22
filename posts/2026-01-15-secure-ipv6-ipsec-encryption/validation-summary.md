# Validation Summary: How to Secure IPv6 with IPsec for Encrypted Communication

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- IPv6
- IPsec, AH, ESP, IKEv2, and XFRM
- strongSwan and swanctl
- Libreswan
- Linux networking tools: iproute2, ip6tables, nmcli, sysctl, ping6
- Netplan
- X.509 certificate generation with strongSwan pki

## Sources Consulted
- RFC 8504, IPv6 Node Requirements: https://datatracker.ietf.org/doc/html/rfc8504
- RFC 4301, Security Architecture for IP: https://www.rfc-editor.org/rfc/rfc4301
- RFC 4302, IP Authentication Header: https://www.rfc-editor.org/rfc/rfc4302
- RFC 4303, IP Encapsulating Security Payload: https://www.rfc-editor.org/rfc/rfc4303
- RFC 7296, Internet Key Exchange Protocol Version 2: https://www.rfc-editor.org/rfc/rfc7296
- strongSwan configuration files documentation: https://docs.strongswan.org/docs/latest/config/config.html
- strongSwan swanctl.conf documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan algorithm proposal documentation: https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan PKI quickstart: https://docs.strongswan.org/docs/latest/pki/pkiQuickstart.html
- strongSwan security recommendations: https://docs.strongswan.org/docs/latest/howtos/securityRecommendations.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Linux ip-xfrm manual page and local iproute2 help output
- Local ip6tables policy match help output

## Issues Found
- The introduction stated that IPsec is a mandatory component of IPv6. Current RFC 8504 says support for the IPsec architecture is a SHOULD for IPv6 nodes, while nodes that implement IPsec must implement ESP and may implement AH. Updated the wording to distinguish the historical mandatory-to-implement requirement from current requirements.
- The ESP diagram labeled the ESP header as encrypted and authenticated. ESP does not encrypt the ESP header; it authenticates it when authentication is used. Changed the diagram label to "Authenticated" while retaining the encrypted payload label.
- The Netplan example used deprecated `gateway6`. Replaced it with a `routes` entry using `to: "default"` and `via`.
- The Host A strongSwan comment described a transport-mode connection as an encrypted tunnel. Changed it to "encrypted transport connection."
- The site-to-site topology used malformed IPv6 addresses with two `::` contractions. Corrected them to `2001:db8:1::1` and `2001:db8:2::1`.
- The site-to-site `ipsec.conf` examples included `rightfirewall=yes`. For these symmetric examples, `leftfirewall=yes` on each gateway is the local firewall setting needed by strongSwan's legacy updown integration. Removed `rightfirewall=yes`.
- The certificate-generation scripts redirected output into root-owned `/etc/ipsec.d` paths after running only the `ipsec pki` process with `sudo`, which would fail for non-root shells. Piped the output through `sudo tee` instead.
- The swanctl IPv6 pool used `fd00:vpn::/112`, which is not a valid IPv6 prefix because `vpn` is not hexadecimal. Replaced it with `fd00:1234:abcd:1::/112`.
- The troubleshooting script checked for `/proc/sys/net/ipv4/ip_forward` before reading the IPv6 forwarding setting. Changed the test to `/proc/sys/net/ipv6/conf/all/forwarding`.
- The host-to-host strongSwan examples used `leftprotoport=any` and `rightprotoport=any`, which is not a valid protocol selector for "all protocols." Removed those lines because the default traffic selector already allows all protocols.

## Review Notes
The post still uses both legacy strongSwan `ipsec.conf`/`ipsec` examples and modern `swanctl` examples. That is technically valid when the relevant packages/plugins are installed, but strongSwan documents the stroke/ipsec interface as deprecated in favor of swanctl/VICI, so future revisions could make swanctl the primary configuration path.
