# Validation Summary: How to Understand the More Fragments Flag in IPv4

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv4 protocol (RFC 791)
- IP fragmentation and reassembly
- Scapy (Python packet manipulation library)
- tcpdump (BPF filter syntax)
- Network security (Teardrop attack, fragment flooding)

## Sources Consulted
- RFC 791 — Internet Protocol (https://datatracker.ietf.org/doc/html/rfc791) — Flags field bit layout, fragmentation rules, reassembly tuple
- Scapy documentation — `IP.flags` FlagsField definition (`["MF", "DF", "evil"]`) and `fragment()` function signature
- tcpdump / pcap-filter(7) man page — BPF byte-offset syntax (`ip[6] & 0x20`, `ip[6:2] & 0x1fff`)
- Wireshark IPv4 dissector documentation — Flags and Fragment Offset fields

## Issues Found
No technical issues found.

Verified:
- IPv4 Flags field bit numbering (bit 0 Reserved, bit 1 DF, bit 2 MF) matches RFC 791.
- tcpdump filter `ip[6] & 0x20 != 0` correctly tests the MF bit (byte 6, bit 5 = 0x20).
- tcpdump filter `ip[6:2] & 0x1fff != 0` correctly masks the 3 flag bits to extract the 13-bit Fragment Offset.
- Fragmentation example math is correct: 1500-byte MTU minus 20-byte IP header leaves 1480 bytes payload; offset field values (0, 185, 370) equal byte offsets (0, 1480, 2960) divided by 8.
- Scapy code is correct: `Raw`, `IP`, `UDP`, and `fragment` are all importable from `scapy.all`. `f[IP].flags & 0x1` correctly tests MF because Scapy's FlagsField names ["MF", "DF", "evil"] map MF to bit 0 of the integer. `f[IP].frag * 8` correctly converts the 8-byte-unit offset into bytes.
- Reassembly tuple `(src IP, dst IP, protocol, ID)` matches the identification rules in RFC 791 §3.2.
- Teardrop and fragment flooding descriptions are historically accurate.

## Review Notes
- The post uses RFC 791 bit numbering (bit 0 = most significant) for the Flags field, which differs from Scapy's bit-0-is-LSB convention. The post correctly notes this distinction in the Scapy code comment ("MF is bit 0 of the Scapy flags int"), so there is no ambiguity for readers.
- Strictly speaking, MF=0 alone does not always mean "last fragment" — an unfragmented datagram also has MF=0 and offset=0. The post addresses this by specifying "MF=0 combined with a non-zero Fragment Offset" identifies the final fragment, which is accurate.
- The mermaid flowchart is a simplification — in real stacks every fragment is stored, not just non-final ones — but it is reasonable for illustrative purposes.
- The recommendation to "prefer path MTU discovery to avoid fragmentation altogether" aligns with modern best practice (RFC 1191 / RFC 8201).
