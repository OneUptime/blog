# Validation Summary: How to Reassemble Fragmented IPv4 Packets in Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- Wireshark
- TShark
- IPv4 fragmentation and reassembly
- UDP
- Python socket API

## Sources Consulted
- Wireshark Display Filter Reference: Internet Protocol Version 4 — https://www.wireshark.org/docs/dfref/i/ip.html
- Wireshark Display Filter Reference: Data — https://www.wireshark.org/docs/dfref/d/data.html
- TShark manual page — https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark User's Guide: Expert Information — https://www.wireshark.org/docs/wsug_html_chunked/ChAdvExpert.html
- Wireshark User's Guide: Analyze Menu — https://www.wireshark.org/docs/wsug_html_chunked/ChUseAnalyzeMenuSection.html
- Wireshark source: `packet-ip.c` default IPv4 defragmentation preference — https://gitlab.com/wireshark/wireshark/-/raw/master/epan/dissectors/packet-ip.c
- RFC 791: Internet Protocol — https://www.ietf.org/rfc/rfc791
- Wireshark-users archive: reassembled UDP appears on the last fragment when IPv4 reassembly is enabled — https://lists.wireshark.org/archives/wireshark-users/201112/msg00009.html

## Issues Found
- The fragment display example showed an inaccurate final-fragment view and inconsistent byte counts. I corrected it to a consistent three-fragment example that matches Wireshark's reassembly fields and payload sizes.
- The display filter for the reassembled view relied on `_ws.col.protocol`, which is a brittle column-based filter rather than the documented reassembly field. I replaced it with `ip.reassembled.data`.
- The `tshark` export examples used incorrect or unreliable field extraction (`data.data` on the last fragment and `-e data`). I replaced them with `ip.reassembled.data` and added `-2`, which the TShark manual documents for correct reassembly frame dependency handling.
- The Python example implied that sending a 3000-byte UDP datagram always produces IPv4 fragments. I clarified that fragmentation depends on path MTU and sender/path settings.
- The fragment-completeness guidance grouped packets only by `ip.id`. I corrected it to use `ip.src`, `ip.dst`, `ip.proto`, and `ip.id`, which matches RFC 791 reassembly behavior.
- The post said incomplete fragment sets do not appear automatically. I replaced that with the documented `ip.fragment.error` field and Expert Info guidance for reassembly problems.

## Review Notes
- `tshark` was not installed in the local workspace, so the command examples were validated against the official TShark manual and Wireshark field references rather than executed locally.
