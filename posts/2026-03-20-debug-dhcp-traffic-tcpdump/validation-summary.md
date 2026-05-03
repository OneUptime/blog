# Validation Summary: How to Debug DHCP Traffic with tcpdump

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DHCP (Dynamic Host Configuration Protocol, RFC 2131/2132)
- BOOTP (RFC 951)
- tcpdump (libpcap-based packet capture)
- tshark / Wireshark display filters
- Python with Scapy (BOOTP/DHCP/IP layers)

## Sources Consulted
- RFC 2131 (Dynamic Host Configuration Protocol) and RFC 2132 (DHCP Options)
- tcpdump man page and Berkeley Packet Filter syntax
- Scapy source: `scapy/layers/dhcp.py` (`DHCPOptionsField.m2i()`) on github.com/secdev/scapy
- Scapy documentation: https://scapy.readthedocs.io/
- Wireshark display filter reference for DHCP: https://www.wireshark.org/docs/dfref/d/dhcp.html
- Wireshark display filter reference for BOOTP (legacy): https://www.wireshark.org/docs/dfref/b/bootp.html
- Wireshark 3.0 release notes (BOOTP → DHCP rename)

## Issues Found

1. **Scapy script crashed on real captures (`dict(pkt[DHCP].options)`)**
   - `pkt[DHCP].options` is a list that contains a mix of 2-tuples like `('message-type', 2)` and bare string markers `'end'` / `'pad'` (confirmed in Scapy source `DHCPOptionsField.m2i`). Calling `dict()` on a list containing the bare string `'end'` raises `ValueError: dictionary update sequence element #N has length 3; 2 is required`.
   - Fixed by filtering: `dict(o for o in pkt[DHCP].options if isinstance(o, tuple) and len(o) == 2)`.

2. **Missing `IP` import in Scapy script**
   - The script referenced `pkt[IP].src` but only imported `rdpcap, BOOTP, DHCP`. `IP` is not pulled in transitively, so the line would raise `NameError: name 'IP' is not defined`.
   - Fixed by adding `IP` to the import: `from scapy.all import rdpcap, IP, BOOTP, DHCP`.

3. **Outdated `bootp.*` tshark display filter fields**
   - The Wireshark BOOTP dissector was renamed to DHCP in Wireshark 3.0 (2019). Per the official `dfref/b/bootp.html` page, the `bootp.*` field aliases were only kept for the 2.0.0–2.6.20 range and have been removed in current Wireshark 4.x — only `dhcp.*` works now. Additionally, `bootp.option.server_id` was never the correct field name (the canonical name is `dhcp.option.dhcp_server_id`).
   - Updated the tshark example to use modern field names: `dhcp.option.dhcp`, `dhcp.ip.your`, `dhcp.option.dhcp_server_id`, and the display filter `-Y "dhcp"`.

## Review Notes

- The DHCP message type table (1=Discover, 2=Offer, 3=Request, 4=Decline, 5=ACK, 6=NAK, 7=Release) is correct per RFC 2132 §9.6. The post omits 8 (INFORM) and 9+ (FORCERENEW, lease query family), which is reasonable for an introductory diagnostic.
- UDP ports 67 (server) and 68 (client) are correct per RFC 2131 §4.1.
- Sample tcpdump output formatting (`IP 0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP, Request`) matches actual tcpdump output style.
- The "Discover + Offer + no ACK = Firewall blocking port 68 responses" diagnostic is a reasonable shorthand; technically the client's Request and the server's ACK both flow, so a firewall could also be blocking the unicast Request — but the most common real-world cause is exactly what the post describes (broadcast ACK to port 68 being filtered), so the guidance is sound.
- The script using `pkt[BOOTP].yiaddr` for the offered address is correct (Your IP Address is in the BOOTP header per RFC 2131 §2).
