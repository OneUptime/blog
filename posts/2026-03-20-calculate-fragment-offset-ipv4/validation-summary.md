# Validation Summary: How to Calculate Fragment Offset in IPv4 Packets

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IP fragmentation and reassembly
- Python
- Scapy
- UDP

## Sources Consulted
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html
- Scapy API reference for `scapy.layers.inet` and `fragment()`: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet.html

## Issues Found
- The Scapy example used `Raw(b"X" * 3800)` on top of UDP, which produces `3808` bytes of IP payload once the 8-byte UDP header is included. I changed it to `Raw(b"X" * 3792)` and added a brief clarifying comment so the Scapy example matches the post's worked 3800-byte IP payload example.
- The offset-alignment explanation said a receiver "cannot correctly compute byte boundaries" if a non-final fragment payload is not a multiple of 8 bytes. I revised this to the more precise RFC-consistent explanation that a following fragment's offset cannot exactly identify the next byte position in 8-byte units.

## Review Notes
- The post is technically sound after the fixes above.
- The Python example and Scapy example were spot-checked locally with `python3` and `scapy 2.7.0`; the computed fragment offsets were `0`, `185`, and `370` as described.
