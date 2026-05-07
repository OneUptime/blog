# Validation Summary: How to Analyze ARP Traffic with Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- Wireshark
- TShark
- ARP
- libpcap capture filters
- Packet analysis

## Sources Consulted
- Wireshark Display Filter Reference: ARP - https://www.wireshark.org/docs/dfref/a/arp.html
- Wireshark User's Guide: Filtering while capturing - https://www.wireshark.org/docs/wsug_html_chunked/ChCapCaptureFilterSection.html
- Wireshark User's Guide: Expert Information - https://www.wireshark.org/docs/wsug_html_chunked/ChAdvExpert.html
- Wireshark User's Guide: Endpoints - https://www.wireshark.org/docs/wsug_html/
- TShark manual page - https://www.wireshark.org/docs/man-pages/tshark.html
- pcap-filter manual page - https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Wireshark Wiki: Address Resolution Protocol - https://wiki.wireshark.org/AddressResolutionProtocol
- RFC 826: An Ethernet Address Resolution Protocol - https://datatracker.ietf.org/doc/html/rfc826
- RFC 5227: IPv4 Address Conflict Detection - https://datatracker.ietf.org/doc/html/rfc5227

## Issues Found
- The "Show ARP for a specific IP" filter only matched the sender IP (`arp.src.proto_ipv4`). I changed it to match either sender or target IP so it now matches the description.
- The "Show ARP involving a specific MAC" filter only matched the sender MAC (`arp.src.hw_mac`). I changed it to match either sender or target MAC so it now matches the description.
- The duplicate-IP section overstated Wireshark's behavior and implied packet-list coloring as a default. I changed the wording to source-backed expert-information terminology and kept the warning framed as an indicator, not proof, of spoofing.
- The duplicate-IP example filter redundantly used `arp.duplicate-address-frame` alongside `arp.duplicate-address-detected`. I simplified it to the direct expert-info field used for duplicate IP warnings.
- The Endpoints statistics description implied Wireshark would automatically show only ARP endpoints. I clarified that an `arp` display filter should be applied first so the statistics reflect filtered ARP traffic.

## Review Notes
- Wireshark's expert information is advisory and should be treated as a starting point for investigation, not definitive proof of ARP spoofing.
- Wireshark also has an ARP storm expert check, but the official ARP wiki notes that it is disabled by default. The post's `tshark -z io,stat,1` example remains valid for manual rate analysis.
