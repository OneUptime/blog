# Validation Summary: How to Use Wireshark Statistics for Protocol Hierarchy Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (Protocol Hierarchy Statistics window)
- tshark (CLI, `-z io,phs` tap)
- Wireshark display filters
- Network protocols: Ethernet, IPv4, ARP, TCP, UDP, HTTP, TLS, DNS, NTP, QUIC, ICMP, ESP

## Sources Consulted
- Wireshark 3.0.0 Release Notes (SSL → TLS rename): https://www.wireshark.org/docs/relnotes/wireshark-3.0.0.html
- Wireshark Display Filters wiki: https://wiki.wireshark.org/DisplayFilters
- wireshark-filter(4) man page: https://www.wireshark.org/docs/man-pages/wireshark-filter.html
- tshark(1) man page (io,phs tap): https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark User Guide — Protocol Hierarchy Window: https://www.wireshark.org/docs/wsug_html_chunked/ChStatHierarchy.html

## Issues Found
1. **Outdated `ssl` protocol name in tshark output example.** The sample output showed `eth.ip.tcp.ssl`, but the SSL dissector was renamed to TLS in Wireshark 3.0 (February 2019). Updated to `tls`.
2. **Incorrect `tshark -z io,phs` output format.** The post presented entries as dotted paths (`eth.ip.tcp.ssl ...`). Real `io,phs` output uses per-layer indented lines, not dotted notation. Reformatted the example to match actual tshark output (indented tree of filter names).
3. **`grep "Data"` would not match tshark output.** `tshark -z io,phs` prints filter names in lowercase, so the undecoded-payload protocol appears as `data`, not `Data`. Changed the grep pattern and the explanatory comment to lowercase `data`.

## Review Notes
- The illustrative packet/percentage table under "Reading the Protocol Hierarchy" has small internal inconsistencies (e.g., Ethernet packet count 9,998 when all frames should be Ethernet, IPv4+ARP packets summing slightly above Frame total), but these are clearly synthetic example numbers for teaching and not technical claims, so they were left as-is.
- The guidance bullet "Unexpectedly high DNS → DNS amplification attack in progress" is a reasonable heuristic but slightly imprecise — a high DNS share in a local capture more often indicates excessive client lookups or being the reflector/victim of an amplification attack rather than participating in one. Left unchanged as it's presented as one of several possibilities.
- Wireshark's GUI Protocol Hierarchy aggregates TLS under a single "Transport Layer Security" entry rather than splitting by version (so "TLSv1.3" as a sub-entry in the tree example is a simplification), but the intent is clearly illustrative. Left unchanged.
