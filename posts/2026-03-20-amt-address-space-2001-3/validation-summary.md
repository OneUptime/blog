# Validation Summary: How to Understand the AMT Address Space (2001:3::/32)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 special-purpose addressing
- Automatic Multicast Tunneling (AMT)
- RFC 7450 relay discovery and AMT message flow
- RFC 8777 DNS-based AMT discovery
- Python `ipaddress`
- Linux `ip6tables`

## Sources Consulted
- RFC 7450: Automatic Multicast Tunneling - https://www.rfc-editor.org/rfc/rfc7450.html
- RFC 8777: DNS Reverse IP Automatic Multicast Tunneling (AMT) Discovery - https://www.rfc-editor.org/rfc/rfc8777.html
- RFC 9601: Propagating Explicit Congestion Notification across IP Tunnel Headers Separated by a Shim - https://www.rfc-editor.org/rfc/rfc9601.html
- IANA IPv6 Special-Purpose Address Space registry - https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- Python Standard Library: `ipaddress` - https://docs.python.org/3/library/ipaddress.html
- Local CLI help: `ip6tables -h` (iptables v1.8.10)

## Issues Found
- The post described `2001:3::/32` as if AMT relays are generally assigned addresses from that block. RFC 7450 defines it as the IPv6 anycast relay discovery prefix; the well-known public discovery address is `2001:3::1`, and the relay's actual unicast address is returned separately in the Relay Advertisement. The introduction, code example, protocol walkthrough, and conclusion were corrected to match that behavior.
- The DNS example used invalid IPv6 literals such as `2001:3::relay-address` and implied that relay AAAA records should live inside `2001:3::/32`. The example was corrected to distinguish RFC 7450 anycast discovery from RFC 8777 DNS-based discovery and to use a valid documentation unicast address.
- The firewall rules assumed AMT relay traffic would use `2001:3::/32` as the relay source or destination and matched the wrong UDP port direction for gateway replies. The example was corrected to show discovery traffic to `2001:3::1`, subsequent traffic to the relay's returned unicast address, and blocking of UDP port 2268 in both directions when AMT is not used.
- The AMT/PIM-SM comparison said AMT was "essential" for OTT streaming and implied a specific provider-to-ISP deployment model. That wording was softened to a deployment-neutral description of what AMT actually enables: multicast delivery across unicast-only network segments.

## Review Notes
- RFC 7450 is updated by RFC 8777 for DNS-based relay discovery and by RFC 9601 for ECN handling across tunnel headers. Those updates do not change the `2001:3::/32` IANA assignment itself, but they matter if the post is expanded beyond the address-space overview.
