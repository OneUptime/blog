# Validation Summary: How to Analyze IPv6 Tunnel Traffic in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark (display filters, protocol dissectors)
- tshark (CLI analysis)
- tcpdump (capture filters / BPF syntax)
- IPv6 tunneling protocols: 6in4, 6to4, Teredo, GRE, VXLAN, IPsec ESP
- ICMPv6 (Packet Too Big / PMTUD)

## Sources Consulted
- RFC 4213 — Basic Transition Mechanisms for IPv6 Hosts and Routers (6in4, IP protocol 41)
- RFC 3056 — Connection of IPv6 Domains via IPv4 Clouds (6to4)
- RFC 3068 — An Anycast Prefix for 6to4 Relay Routers (192.88.99.0/24)
- RFC 7526 — Deprecating the Anycast Prefix for 6to4 Relay Routers
- RFC 4380 — Teredo: Tunneling IPv6 over UDP through NATs (UDP 3544, bubble packets)
- RFC 2784 — Generic Routing Encapsulation (GRE, IP protocol 47)
- RFC 4303 — IP Encapsulating Security Payload (ESP, IP protocol 50)
- RFC 7348 — VXLAN (IANA-assigned UDP port 4789)
- RFC 4443 — ICMPv6 (Type 2 = Packet Too Big)
- Wireshark display filter reference (ip.proto, ipv6.src, ipv6.hlim, gre.proto, teredo, vxlan, udp.length)
- tcpdump pcap-filter(7) manpage (ip proto, udp port)

## Issues Found
- **Incorrect Teredo bubble filter**: The original filter used `teredo && udp.length == 8` with comment "empty UDP". Per RFC 4380, a Teredo bubble is a minimal IPv6 packet consisting of just an IPv6 header (40 bytes) with no payload, encapsulated in UDP. The UDP length field includes the 8-byte UDP header plus the 40-byte IPv6 header, so the correct value is 48, not 8. `udp.length == 8` would be a UDP datagram with zero payload, which cannot carry a Teredo-encapsulated IPv6 header. Changed to `udp.length == 48` and updated the comment to "IPv6 header only, no payload".

## Review Notes
- The 6to4 relay prefix `192.88.99.0/24` referenced in the post is technically deprecated by RFC 7526 (2015). It is still valid to filter on for legacy/historical 6to4 traffic, which remains in use on some networks, so the filter example is retained as written.
- The MTU filter `ip.proto == 41 && frame.len > 1480` is somewhat imprecise (frame.len is the full Ethernet frame, not inner IPv6 size), but it is a reasonable heuristic for spotting potentially MTU-problematic tunneled packets.
- `gre.proto == 0x86dd` correctly matches IPv6 as the GRE-encapsulated protocol (0x86dd is the IPv6 EtherType).
- All other display filters, tcpdump BPF expressions, and tshark field extractions verified against current documentation.
