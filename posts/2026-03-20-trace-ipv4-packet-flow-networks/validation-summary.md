# Validation Summary: How to Trace IPv4 Packet Flow Across Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 packet forwarding and TTL
- ICMP Echo, Time Exceeded, and Destination Unreachable messages
- Linux `traceroute` and Windows `tracert`
- `mtr`
- `tcpdump`, libpcap capture filters, and Wireshark
- Python and Scapy packet crafting
- `netstat` and `ss`

## Sources Consulted
- RFC 791: Internet Protocol - https://www.rfc-editor.org/rfc/rfc791
- RFC 792: Internet Control Message Protocol - https://www.rfc-editor.org/rfc/rfc792
- Linux `traceroute(8)` manual page - https://linuxman7.org/linux/man-pages/man8/traceroute.8.html
- Microsoft `tracert` command documentation - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
- MTR official repository and `mtr(8)` man page source - https://github.com/traviscross/mtr and https://raw.githubusercontent.com/traviscross/mtr/master/man/mtr.8.in
- Debian `tcpdump(8)` manual page - https://manpages.debian.org/trixie/tcpdump/tcpdump.8.en.html
- Scapy usage documentation, including traceroute examples - https://scapy.readthedocs.io/en/stable/usage.html
- iputils `ping(8)` manual page - https://man7.org/linux/man-pages/man8/ping.8.html
- Local CLI help output for `mtr --help` and `tcpdump --help`

## Issues Found
- The ICMP traceroute example said `traceroute -I` requires root. Current Linux traceroute documentation notes ICMP tracing may be allowed for unprivileged users when datagram ICMP sockets and `ping_group_range` permit it, so the note was changed to "may require root/CAP_NET_RAW."
- The Scapy UDP traceroute stopped on any ICMP type 3 response and included an ICMP Echo Reply stop condition. For UDP traceroute, the normal destination signal is ICMP Destination Unreachable with code 3 (Port Unreachable), so the code now checks `icmp.type == 3 and icmp.code == 3`.
- The tcpdump interface comments described the WAN side as incoming and the LAN side as forwarded for an outbound trace to `8.8.8.8`. The comments now describe packets arriving from LAN and leaving through WAN.
- The traceroute asterisk explanation said asterisks indicate blocked ICMP Time Exceeded responses. Official docs describe asterisks as no response before timeout, so the text now includes timeout, filtering, and rate limiting.

## Review Notes
- The commands and options shown for `traceroute`, `tracert`, `mtr`, and `tcpdump` are valid for the documented implementations checked.
- Packet capture and Scapy raw packet sending usually require root or equivalent capabilities on Linux.
- Intermediate-hop packet loss in traceroute or MTR can reflect ICMP rate limiting or de-prioritization rather than actual end-to-end packet loss.
