# Validation Summary: How to Understand the Mobility Header in IPv6 - Part 2

## Status
validated

## Post Type
Reference / Technical Guide — explains the IPv6 Mobility Header structure and shows how to inspect/craft Mobile IPv6 messages with Scapy, tcpdump, and Wireshark.

## Technologies Covered
- Mobile IPv6 (RFC 6275)
- IPv6 Mobility Header extension header (Next Header = 135)
- Binding Update / Binding Acknowledgement / Return Routability messages
- Scapy (Python packet manipulation library)
- tcpdump (with `ip6 proto 135` filter)
- Wireshark display filters (`mip6`, `mip6.mh_type`)

## Sources Consulted
- RFC 6275 — Mobility Support in IPv6 (https://datatracker.ietf.org/doc/html/rfc6275), particularly Sections 6.1 (Mobility Header structure), 6.1.1 (MH Type values), and 6.1.7 (Binding Update message format and flag bits)
- IANA "Mobility Header Types - for the MH Type field in the Mobility Header" registry
- IANA Protocol Numbers registry (Mobility Header = 135, IPv6 No-Next-Header = 59)
- RFC 3963 (NEMO — defines R bit), RFC 4140 (HMIPv6 — defines M bit), RFC 5213 (PMIPv6 — defines P bit) for the additional BU flag bits
- Scapy source `scapy/layers/inet6.py` on the secdev/scapy master branch — verified `MIP6MH_BU` (fields `seq`, `flags`, `mhtime`) and `MIP6OptAltCoA` (field `acoa`) class definitions

## Issues Found
1. **Incorrect Scapy import path.** The post imported `from scapy.contrib.mobileipv6 import *`, but no such module exists in Scapy. The Mobile IPv6 classes (`MIP6MH_BU`, `MIP6OptAltCoA`, etc.) live in `scapy/layers/inet6.py` and are already exported via `from scapy.all import *`. Removed the bogus second import line.
2. **Wrong Scapy class name `MIP6OptAlternateCoA`.** Scapy's class is named `MIP6OptAltCoA` (abbreviated). Renamed in the example.
3. **Wrong field name `addr`.** The `MIP6OptAltCoA` class uses the field `acoa` for the alternate care-of address, not `addr`. Updated to `acoa="2001:db8:foreign::50"`.

All other technical content checked out: protocol number 135, Mobility Header field layout, MH Type values 0–7, BU flag set (A/H/L/K/M/R/P), the `mhtime`-units-of-4-seconds calculation (150 × 4 = 600 s), the `ip6 proto 135` tcpdump BPF filter, and the `mip6` / `mip6.mh_type == 5` Wireshark display filters.

## Review Notes
- The `tcpdump` "Example output" block is a stylized illustration rather than verbatim tcpdump output — real tcpdump renders Mobility Header lines on a single line (e.g. `mobility: BU seq#=42 A H lifetime=150`). Acceptable as illustrative pseudo-output, but worth keeping in mind for readers who try to grep for that exact format.
- The Binding Update ASCII diagram stacks Sequence Number, flags+Reserved, and Lifetime as separate 16-bit rows; in the wire format per RFC 6275 §6.1.7 the flags+Reserved share a 32-bit word with Lifetime. The post's layout is schematically correct (each row's bit count matches) but does not literally mirror the on-wire word boundaries.
- Newer Mobile IPv6 extensions (RFC 5648 B-bit, RFC 5096 F-bit, RFC 6602 T-bit) are not covered; the post focuses on the original RFC 6275 flags plus the common A/H/L/K/M/R/P set, which is sufficient for an introductory reference.
