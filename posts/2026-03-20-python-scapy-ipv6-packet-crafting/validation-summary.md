# Validation Summary: How to Use Python scapy for IPv6 Packet Crafting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Scapy
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- TCP
- Packet sniffing

## Sources Consulted
- Scapy installation docs: https://scapy.readthedocs.io/en/latest/installation.html
- Scapy usage docs: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy IPv6 API reference: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Scapy IPv6 utility helpers: https://scapy.readthedocs.io/en/latest/api/scapy.utils6.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 2464, Transmission of IPv6 Packets over Ethernet Networks: https://www.rfc-editor.org/rfc/rfc2464
- RFC 9293, Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293

## Issues Found
- The Neighbor Solicitation example derived the solicited-node multicast IPv6 destination incorrectly, used an invalid placeholder Ethernet multicast MAC, omitted the required `hlim=255`, and referenced `ipaddress` without importing it. I replaced that logic with Scapy's documented IPv6 helper functions so the packet uses the correct solicited-node multicast IPv6 and Ethernet destinations and a valid source address.
- The TCP SYN scan cleanup packet sent a bare RST without tying it to the original probe state. I updated it to use a stable source port for the SYN and a matching reset sequence number, and I added ICMPv6 destination-unreachable handling so filtered results are classified correctly.
- Two examples used `print(packet.show())`, which prints the decoded packet and then prints `None`. I changed those calls to `packet.show()`.
- The sniffing example claimed it was filtering ICMPv6 traffic while using `filter="ip6"`. I changed the BPF filter to `icmp6` so the code matches the explanation.
- The conclusion overstated Layer 2 handling as automatic in all cases. I corrected that wording to reflect that Scapy automates checksums and extension-header handling while still allowing explicit Ethernet framing when needed.

## Review Notes
- `sniff(filter=...)` depends on BPF/libpcap support, so the install section now notes that requirement for Linux users.
- IPv6 link-local and multicast traffic can require explicit interface selection in Scapy; this post uses `srp1(..., iface=interface)` for the NDP example, which is the correct Layer 2 approach for that case.
