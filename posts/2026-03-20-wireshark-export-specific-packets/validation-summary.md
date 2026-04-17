# Validation Summary: How to Export Specific Packets from a Wireshark Capture

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Wireshark (GUI packet analyzer)
- tshark (CLI packet analyzer)
- mergecap (PCAP merging utility)
- PCAP / pcapng file formats
- Wireshark display filter language

## Sources Consulted
- Wireshark User's Guide - Export Specified Packets: https://www.wireshark.org/docs/wsug_html_chunked/ChIOExportSection.html
- Wireshark User's Guide - Marking Packets: https://www.wireshark.org/docs/wsug_html_chunked/ChWorkMarkPacketSection.html
- tshark manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- mergecap manual page: https://www.wireshark.org/docs/man-pages/mergecap.html
- Wireshark display filter reference: https://www.wireshark.org/docs/dfref/
- Wireshark source (packet-ftp.c / export_object registrations) confirming FTP-DATA, HTTP, DICOM, SMB, TFTP, IMF as supported Export Objects

## Issues Found
No technical issues found.

Verified details:
- `File → Export Specified Packets` menu path and dialog options (Captured/Displayed, All/Selected/Marked/Range) are accurate.
- Ctrl+click / Shift+click multi-selection in the packet list is supported in modern Wireshark (3.x+).
- Ctrl+M is the correct shortcut for Edit → Mark/Unmark Packet; marked rows are highlighted (black background by default).
- Export Objects supports HTTP, DICOM, FTP-DATA, TFTP (and additionally SMB, IMF). The three listed are valid.
- tshark flags `-r` (read file), `-Y` (display filter), `-w` (write file) are correct and current.
- Display filters used (`ip.addr`, `tcp.port`, `frame.time_relative`, `tcp.analysis.retransmission`, `dns.flags.rcode`) are all valid fields in the Wireshark display filter reference.
- `mergecap -w <out> <inputs...>` and `-F pcap` format flag are correct; mergecap sorts by timestamp by default.

## Review Notes
- The post uses ```bash and ```sql fences for what are actually UI/menu instructions. This is a stylistic choice and does not affect technical correctness.
- For complex stateful filters like `tcp.analysis.retransmission`, tshark's two-pass mode (`-2`) can be more reliable in some edge cases, but single-pass with `-Y` typically produces correct results and is the more common usage.
- The "Ctrl+A to select all packets" tip relies on Qt's default list-selection behavior when the packet list has focus; it is not a documented Wireshark shortcut, but it generally works in current versions. Since the tip's ultimate recommendation (use "Displayed" for filter-based export) is correct, this is not an issue.
- The `-F pcap` option in the final mergecap example forces legacy pcap format; without it, mergecap defaults to pcapng. This is correctly implied by the example.
