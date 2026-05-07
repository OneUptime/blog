# Validation Summary: How to Analyze DHCP Packets in Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv4
- Wireshark
- TShark
- libpcap / BPF capture filters
- Packet analysis

## Sources Consulted
- Wireshark Display Filter Reference: Dynamic Host Configuration Protocol — https://www.wireshark.org/docs/dfref/d/dhcp.html
- Wireshark 3.0.0 Release Notes — https://www.wireshark.org/docs/relnotes/wireshark-3.0.0.html
- TShark Manual Page — https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark User’s Guide: Following Protocol Streams — https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html
- Wireshark User’s Guide: Filtering while capturing — https://www.wireshark.org/docs/wsug_html_chunked/ChCapCaptureFilterSection.html
- RFC 2131: Dynamic Host Configuration Protocol — https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132: DHCP Options and BOOTP Vendor Extensions — https://www.rfc-editor.org/rfc/rfc2132

## Issues Found
- The post used deprecated `bootp.*` display filters and `tshark` field names. I updated them to `dhcp.*` because current Wireshark documentation uses `dhcp.*`, and `bootp.*` remains only as a deprecated alias.
- The `tshark` statistics example used `-z bootp,stat`. I changed it to `-z dhcp,stat`, which is the current selector documented by Wireshark.
- The dissection section labeled the BOOTP `op` field as “Message type,” which could be confused with DHCP option 53. I changed it to “BOOTP op code” to distinguish it from the DHCP message type option.
- The explanation of “Next server IP address” conflated `siaddr` with DHCP option 66. I corrected it to describe `siaddr` as the next bootstrap or PXE server IP; option 66 is a separate TFTP server name option.
- The DORA section overstated what **Follow → UDP Stream** guarantees for DHCP traffic. I changed it to say it shows packets in that UDP conversation, while retaining transaction ID filtering as the precise way to isolate one exchange.
- The troubleshooting table treated some observations as definitive diagnoses. I adjusted the “no offers” and “multiple offers” rows to reflect the most common causes without overstating certainty.

## Review Notes
- The examples are DHCPv4-specific. They use DORA, BOOTP/DHCPv4 fields, and UDP ports 67/68; DHCPv6 uses different ports and message types.
