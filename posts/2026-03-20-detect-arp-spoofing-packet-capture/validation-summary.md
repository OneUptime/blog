# Validation Summary: How to Detect ARP Spoofing Attacks Using Packet Capture

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP
- IPv4
- Scapy
- Python
- Dynamic ARP Inspection (DAI)

## Sources Consulted
- Scapy usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy `sendrecv` API reference: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- Scapy `ARP` layer API reference: https://scapy.readthedocs.io/en/latest/api/scapy.layers.l2.html
- RFC 826, Address Resolution Protocol: https://www.rfc-editor.org/rfc/rfc826.html
- RFC 5227, IPv4 Address Conflict Detection: https://www.rfc-editor.org/rfc/rfc5227
- Cisco IOS XE Dynamic ARP Inspection documentation: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/dynamic-arp-inspection.html

## Issues Found
- The post description said it detected conflicting MAC-to-IP mappings. I corrected that to IP-to-MAC mappings, which matches how ARP resolution and the example detector actually work.
- The introduction described ARP spoofing as fake ARP replies only. I changed that to fake ARP packets because ARP requests can also assert sender mappings and participate in spoofing-related cache poisoning behavior per RFC 826 and RFC 5227.
- The detector comment said it only analyzed replies and gratuitous ARPs, but the code actually processes both requests and replies. I corrected the comment to match the implementation and RFC behavior.
- The automated response snippet built a broadcast ARP reply with `pdst="255.255.255.255"` and a broadcast ARP target MAC. I changed it to a broadcast ARP announcement request with matching sender and target IPs and an all-zero target hardware address, which aligns with RFC 5227 and is more broadly interoperable.
- The conclusion said detection requires knowing the legitimate MAC for each IP. I corrected that to distinguish between spotting suspicious IP-to-MAC conflicts and confidently deciding which mapping is legitimate.
- The conclusion said DAI validates at the hardware level. I changed that to validate at the switch, which is the behavior described in Cisco’s documentation.

## Review Notes
- The Scapy examples match current documented APIs. `sniff(filter="arp", iface=..., prn=..., store=False)` and `sendp(...)` are current and valid.
- The detector script is syntactically valid Python. I also locally sanity-checked the corrected ARP announcement packet shape with Scapy 2.7.0.
- Platform caveat: Scapy packet capture filters rely on BPF/libpcap support on the host. The post’s commands are still valid, but filter behavior can depend on the local capture stack.
