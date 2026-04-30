# Validation Summary: How ICMPv6 Source Address Is Determined

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6
- RFC 4443
- RFC 4291
- RFC 6724
- Linux `ping`
- Linux `tracepath`
- `tcpdump`
- Python `ipaddress`

## Sources Consulted
- RFC 4443, Section 2.2 and Section 2.4: https://www.rfc-editor.org/rfc/rfc4443.html
- RFC 4291, Section 2.5.2 and Section 2.5.3: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 6724, source address selection rules: https://www.rfc-editor.org/rfc/rfc6724.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Local Linux man pages and help output: `man ping`, `man tracepath`, `tcpdump --help`

## Issues Found
- The post said RFC 4443 requires ICMPv6 errors to use an address from the interface on which the bad packet arrived. That is not what RFC 4443 Section 2.2 says. I corrected the explanation to match the RFC: reply from the same local unicast address when applicable; otherwise use a node unicast address chosen for the ICMPv6 destination.
- The RFC summary block described an ingress-interface rule and an invented priority order. I replaced it with a technically accurate summary of RFC 4443 Section 2.2.
- The traceroute explanation claimed that `Time Exceeded` messages come from the ingress interface address. I corrected this to reflect that routers choose a unicast source for the reply path back to the sender.
- The PMTU explanation claimed `Packet Too Big` uses the ingress interface address. I corrected this to describe the typical reply-path behavior and the RFC 4443 guidance.
- The verification commands mixed IPv6 tooling with an IPv4 destination (`ping6 ... 8.8.8.8`) and used older/staler command forms. I changed the examples to current, correct IPv6 commands and replaced `traceroute6` with `tracepath -6`, which the local `tracepath` man page documents as a good replacement.
- The Python example did not model RFC 4443 correctly, excluded valid link-local unicast addresses, used `is_global` in a way that breaks on documentation prefixes like `2001:db8::/32`, and labeled the router interfaces in a way that did not match the return-path behavior of ICMPv6 errors. I replaced it with a simplified but technically truthful simulation.
- The “Common Source Address Mistakes” section incorrectly implied that using the incoming-interface subnet is the governing rule and attributed some prohibitions directly to RFC 4443. I corrected those items and referenced RFC 4291 where the unspecified and loopback restrictions actually come from.

## Review Notes
- The `tcpdump` filters use `ip6[40]` to inspect the ICMPv6 type field. That works for simple packets without preceding IPv6 extension headers, which is fine for an introductory example, but it is not a fully general decoder for every IPv6 packet layout.
