# Validation Summary: How to Capture and Filter UDP Traffic in Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- Wireshark
- TShark
- UDP
- ICMP
- libpcap / BPF capture filters
- DNS
- DHCP
- NTP
- SNMP
- RTP
- TFTP

## Sources Consulted
- Wireshark `tshark(1)` manual: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark `pcap-filter` manual: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Wireshark UDP display filter reference: https://www.wireshark.org/docs/dfref/u/udp.html
- Wireshark User’s Guide, Statistics menu: https://www.wireshark.org/docs/wsug_html_chunked/ChUseStatisticsMenuSection.html
- Wireshark User’s Guide, DNS statistics: https://www.wireshark.org/docs/wsug_html_chunked/ChStatDNS.html
- Wireshark User’s Guide, RTP Decoding Settings / RTP Streams / Expert Information / Decode As: https://www.wireshark.org/docs/wsug_html/

## Issues Found
- The display filter `udp.checksum_bad == true` used a legacy field name that only existed through older Wireshark releases. I changed it to `udp.checksum.bad`, which matches the current UDP display filter reference.
- The RTP section implied that Wireshark automatically recognizes RTP on dynamic UDP ports. Current Wireshark documentation says RTP on random UDP ports is usually identified from signaling, or by using heuristics or `Decode As`. I updated the wording to reflect that behavior.
- The RTP section used outdated GUI labels. I changed `Telephony → RTP → Show All Streams` to `Telephony → RTP → RTP Streams` and `Analyze → Expert Information` to `Analyze → Expert Info`, matching the current User’s Guide.
- The DNS statistics description said `Statistics → DNS` shows response time distribution. The current DNS statistics documentation describes grouped counts by opcode, response code, query type, and related request-response observations. I corrected that description.
- The `tshark` UDP payload export example used BPF-style filter syntax while reading from a capture file and relied on `data.data`. I changed it to an explicit display filter with `-Y 'udp.dstport == 5000'` and `-e @udp.payload`, which matches current `tshark` filtering and field-output behavior.
- The example labeled `Save all UDP packets to separate files` did not match what the command actually did. I replaced it with a direct `tshark` command that writes matching packets to one separate capture file.

## Review Notes
- The post is technically accurate after the fixes above.
- The updated `udp.payload` field is documented in current Wireshark releases; if this post is later retargeted to much older Wireshark versions, that command may need a version note.
- `tshark` is not installed in this workspace, so command validation was done against the official Wireshark documentation rather than by executing the examples locally.
