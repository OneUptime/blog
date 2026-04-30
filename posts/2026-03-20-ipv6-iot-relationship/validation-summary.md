# Validation Summary: How to Understand the Relationship Between IPv6 and IoT

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IoT networking
- NAT
- SLAAC
- IPsec
- IPv6 multicast
- Neighbor Discovery Protocol (NDP)
- 6LoWPAN
- CoAP
- MQTT
- Matter
- Thread
- Linux `ip6tables` / Netfilter

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://datatracker.ietf.org/doc/rfc8200/
- RFC 4291, "IP Version 6 Addressing Architecture" - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://datatracker.ietf.org/doc/rfc4861/
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 6282, "Compression Format for IPv6 Datagrams over IEEE 802.15.4-Based Networks" - https://datatracker.ietf.org/doc/html/rfc6282
- RFC 8504, "IPv6 Node Requirements" - https://datatracker.ietf.org/doc/rfc8504/
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification" - https://datatracker.ietf.org/doc/rfc4443/
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls" - https://datatracker.ietf.org/doc/html/rfc4890
- `ip6tables(8)` man page - https://www.man7.org/linux/man-pages/man8/ip6tables.8.html
- `iptables-extensions(8)` man page - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- OpenThread official documentation - https://openthread.io/

## Issues Found
- Corrected the area comparison from `~670 quadrillion addresses per km²` to `~670 quadrillion addresses per mm²`. The original unit was off by a factor of 10^12.
- Reworded the introduction and NAT discussion to avoid overstating that IoT universally requires globally routable addresses and that IPv6 automatically makes every device directly reachable. IPv6 enables end-to-end reachability when global addressing, routing, and firewall policy permit it.
- Changed the `Mandatory IPsec Support` heading to `IPsec Support` so it matches current IPv6 node requirements. RFC 8504 keeps IPsec architecture support as a `SHOULD`, not a blanket current requirement.
- Removed the claim that NDP is "more secure" than ARP. RFC 4861 includes explicit security considerations and known attack classes; NDP is more flexible, but not inherently secure by itself.
- Corrected the protocol stack so `DTLS`/`TLS` are shown as security protocols instead of transport-layer protocols.
- Tightened the 6LoWPAN compression wording to match RFC 6282 more closely: as little as 2 bytes in the best single-hop case and about 7 bytes when routing across multiple IP hops.
- Replaced the firewall example with a technically correct `ip6tables` example using `conntrack` syntax and the correct `FORWARD` direction for protecting the device-facing LAN. The original example matched `-i eth1`, which would not block unsolicited inbound traffic headed out to devices on `eth1`.

## Review Notes
- The IoT device-count figures are forecast-based market estimates rather than protocol requirements, so they may age faster than the rest of the post.
- The `ip6tables` snippet is still an illustrative example, not a complete production firewall policy.
