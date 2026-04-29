# Validation Summary: How to Monitor IGMP Join and Leave Events in Real Time

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- IGMP (Internet Group Management Protocol) v1/v2/v3
- tcpdump (BPF capture filters)
- tshark / Wireshark display filters
- Linux /proc/net/igmp
- Bash scripting

## Sources Consulted
- RFC 2236 (IGMPv2): https://www.rfc-editor.org/rfc/rfc2236
- RFC 3376 (IGMPv3): https://www.rfc-editor.org/rfc/rfc3376
- IANA Protocol Numbers (IGMP = 2): https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- IANA IPv4 Multicast Address Space (224.0.0.2 All Routers, 224.0.0.22 IGMPv3): https://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml
- tcpdump manual page: https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter syntax (`ip proto 2`): https://www.tcpdump.org/manpages/pcap-filter.7.html
- tshark manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark IGMP display filter reference: https://www.wireshark.org/docs/dfref/i/igmp.html
- Linux kernel docs on /proc/net/igmp (net/ipv4/igmp.c)

## Issues Found
No technical issues found.

Verified:
- IP protocol number 2 is correctly identified as IGMP (IANA)
- IGMP message type codes are correct per RFC 3376:
  - 0x11 Membership Query, 0x16 IGMPv2 Report, 0x17 IGMPv2 Leave, 0x22 IGMPv3 Report
- Destination addresses are correct: 224.0.0.2 (All Routers, used for IGMPv2 Leave), 224.0.0.22 (IGMPv3 Reports)
- tcpdump flags (`-i`, `-n`, `-v`, `-l`) are valid and behave as described
- BPF filter `ip proto 2` correctly captures IGMP traffic
- Wireshark display filter fields used (`igmp.type`, `igmp.maddr`, `igmp.num_grp_recs`, `igmp.version`, `ip.src`, `ip.dst`, `frame.time`) are all valid
- /proc/net/igmp exists on Linux and reflects current multicast group memberships
- Bash script uses `#!/bin/bash` shebang, so process substitution `<()` is valid
- Sample tcpdump output format matches actual tcpdump IGMP decode output

## Review Notes
- The /proc/net/igmp polling approach detects state changes between polls but may miss rapid join/leave bursts that occur within the 2-second sleep window. The conclusion's wording "detect membership changes even between IGMP messages" is slightly imprecise but not technically wrong.
- IGMPv1 Membership Report (0x12) is not included in the type code table; this is a minor omission since IGMPv1 is rarely seen on modern networks.
- The IGMPv2 Leave filter using `grep -i "leave"` is fine for tcpdump verbose output, but a more precise approach would be `tcpdump 'igmp[0] = 0x17'`. The post's approach is reasonable for a tutorial context.
