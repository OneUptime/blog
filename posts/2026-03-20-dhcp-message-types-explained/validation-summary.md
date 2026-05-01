# Validation Summary: How to Understand DHCP Message Types

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv4
- BOOTP/DHCP packet analysis
- `tcpdump`
- `tshark`
- `journalctl`

## Sources Consulted
- RFC 2131: Dynamic Host Configuration Protocol — https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132: DHCP Options and BOOTP Vendor Extensions — https://www.rfc-editor.org/rfc/rfc2132
- Wireshark Display Filter Reference: Dynamic Host Configuration Protocol — https://www.wireshark.org/docs/dfref/d/dhcp.html
- Wireshark User’s Guide — https://www.wireshark.org/docs/wsug_html/
- systemd `journalctl` man page — https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local `tcpdump --help` and `man tcpdump`

## Issues Found
- The `DHCPDECLINE` message flow was incorrect. The post showed ARP conflict detection immediately after `DHCPOFFER`, but RFC 2131 specifies that the client performs the address check after `DHCPACK`. I updated the flow to `DISCOVER → OFFER → REQUEST → ACK → ARP probe → DECLINE`.
- The `DHCPINFORM` explanation was imprecise. RFC 2131 says the server responds with `DHCPACK`, must not send lease expiration time, and should not fill `yiaddr`. I updated the wording to reflect that behavior.
- The `tshark` example used deprecated `bootp` display filter names. Current Wireshark documentation uses `dhcp` field names, so I changed the example to `-Y "dhcp"` and `-e dhcp.type`.
- The statement that a declined address is usually held for 24 hours was too implementation-specific. RFC 2131 only requires the server to mark the address unavailable; reuse timing depends on the server implementation. I replaced that claim with RFC-accurate wording.
- The final takeaway on `DHCPDECLINE` implied the conflict is detected on the offered address before lease confirmation. I corrected it to describe the ARP check after `DHCPACK`.

## Review Notes
- The packet-capture commands are syntactically valid. The `journalctl -u isc-dhcp-server` example is specific to systemd-based systems running ISC DHCP, so readers may need a different unit name on other distributions or when using another DHCP server such as Kea.
