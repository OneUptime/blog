# Validation Summary: How to Craft Custom IPv4 Packets for Testing

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- IPv4 protocol (RFC 791)
- ICMP (RFC 792)
- DSCP / DiffServ (RFC 2474, RFC 3246 for EF)
- Scapy (Python packet manipulation library)
- hping3 (CLI packet crafting tool)
- nping, iperf3, netcat (briefly mentioned in tool comparison table)

## Sources Consulted
- RFC 791 — Internet Protocol (IPv4 header format, IHL field)
- RFC 792 — Internet Control Message Protocol (ICMP type/code values)
- RFC 2474 — Definition of the Differentiated Services Field (DS Field)
- RFC 3246 — An Expedited Forwarding PHB (DSCP EF value 101110 = 46)
- Scapy official documentation (https://scapy.readthedocs.io/) — IP, UDP, ICMP, Raw layers and field names
- hping3 man page — option flags (`-S`, `-p`, `-a`/`--spoof`, `--icmp`, `--flood`, `--count`, `--udp`, `--ttl`)

## Issues Found
No technical issues found.

Verification details:
- DSCP EF = 46 (binary 101110) per RFC 3246. The TOS byte calculation `46 << 2 = 184 = 0xB8` correctly accounts for the 2 ECN bits at the bottom of the byte.
- Scapy field names (`tos`, `ttl`, `flags`, `id`, `ihl`, `nexthopmtu`) match the current Scapy API.
- ICMP type 3, code 4 ("Fragmentation Needed and Don't Fragment was Set") matches RFC 792 / RFC 1191.
- `IHL=15` (max value) with no actual options does claim a 60-byte header while only sending the default 20-byte header — a valid malformed-packet test case.
- All hping3 flags verified against the man page; `--spoof`, `--flood --count N`, and `--ttl` combinations are all valid.

## Review Notes
- The iperf3 description as "Bandwidth and MTU testing" is borderline — iperf3 is primarily a bandwidth tool and supports MTU/MSS via `-M`, so this is acceptable shorthand.
- Code examples require root/CAP_NET_RAW privileges to actually send raw packets; this is implied by the `sudo` in hping3 examples but not stated for the Scapy snippets. Not a technical error, just a usability note.
- The malformed IHL example relies on Scapy not auto-correcting the manually set `ihl` field, which is the current behavior.
- The `bytes(reply[Raw])` access in the ICMP echo example assumes the reply contains a Raw layer; this is true for echo replies that mirror the request payload, but defensive code might check `Raw in reply` first.
