# Validation Summary: How to Understand RIPng Message Format

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- RIPng
- IPv6
- UDP
- tcpdump / libpcap capture filters
- TShark / Wireshark display fields

## Sources Consulted
- RFC 2080: RIPng for IPv6: https://datatracker.ietf.org/doc/html/rfc2080
- Wireshark Display Filter Reference: IPv6: https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark Display Filter Reference: RIPng: https://www.wireshark.org/docs/dfref/r/ripng.html
- Wireshark TShark manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Local tcpdump 4.99.4 and libpcap 1.10.4 help/man pages

## Issues Found
- Tightened the message structure wording from "one or more RTEs" to "a list of RTEs" because RFC 2080 handles empty Request messages by giving no response.
- Corrected the next-hop RTE description to state that the next-hop address must be link-local, that both Route Tag and Prefix Length are zero for the next-hop RTE, and that the all-zero prefix field means the originator of the RIPng advertisement is used as the next hop. This matches RFC 2080 section 2.1.1.
- Updated the tcpdump sample output to match tcpdump 4.99.4's RIPng decoder format and corrected the payload length for a single-RTE RIPng response.
- Replaced outdated/incorrect TShark field names (`ip6.src`, `ripng.prefix`, `ripng.prefixlen`, and `ripng.metric`) with the current documented Wireshark field names (`ipv6.src`, `ripng.rte.ipv6_prefix`, `ripng.rte.prefix_length`, and `ripng.rte.metric`).
- Replaced the incorrect fixed limit of 25 RTEs per RIPng message with the RFC 2080 MTU-based calculation. With the IPv6 minimum MTU of 1280 bytes and no IPv6 extension headers, 61 20-byte RTEs fit after the IPv6, UDP, and RIPng headers.

## Review Notes
The tcpdump request filter uses a fixed IPv6 payload offset and is valid for ordinary RIPng packets without IPv6 extension headers. It may not match packets that include extension headers before UDP.
