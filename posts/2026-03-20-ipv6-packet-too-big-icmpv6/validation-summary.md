# Validation Summary: How to Understand ICMPv6 Packet Too Big Messages

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- ICMPv6 Packet Too Big messages
- IPv6 Path MTU Discovery (PMTUD)
- Python binary parsing with `struct`
- `tcpdump`, libpcap filter syntax, and `awk`

## Sources Consulted
- [RFC 4443: Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc4443)
- [RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200)
- [RFC 8201: Path MTU Discovery for IP version 6](https://www.rfc-editor.org/rfc/rfc8201)
- [Python `struct` module documentation](https://docs.python.org/3/library/struct.html)
- Local `pcap-filter(7)` manual page from libpcap 1.10.4
- Local `tcpdump(1)` manual page and `tcpdump --help` output from tcpdump 4.99.4

## Issues Found
1. The post's `MTU < 1280` explanation was based on obsolete guidance. RFC 8201 requires a node to discard Packet Too Big messages that report a next-hop MTU below the IPv6 minimum link MTU of 1280 bytes. I rewrote that section to reflect current RFC 8201 behavior and clarified, per RFC 8200, that links smaller than 1280 must handle fragmentation and reassembly below IPv6.
2. The router-generation section said the ICMPv6 source address should be the router's address on the ingress interface. RFC 4443 Section 2.2 instead requires a unicast source address chosen according to normal source-address selection rules for the reply. I corrected that description.
3. The Python parsing and handling examples encoded the obsolete sub-1280 behavior by clamping the MTU to 1280 and requiring a Fragment Header. I updated the examples so sub-1280 PTB messages are flagged for discard, are not used to update PMTU cache state, and Code 0 is validated explicitly.
4. The monitoring section's second command description implied it was extracting bytes 44-47 directly, but the pipeline was actually relying on `tcpdump`'s textual decode. I corrected the description to match what the command does.
5. The monitoring section's "per minute" `awk` example counted every 60 packets, not every 60 seconds. I replaced it with a clock-minute counter driven by `tcpdump` timestamps and switched the filter to the documented symbolic libpcap form `icmp6[icmp6type] == icmp6-packettoobig`.
6. The conclusion overstated firewall behavior by saying PTB messages must never be blocked and that blocking them would break PMTUD for all traffic. I corrected this to the technically accurate claim that indiscriminate filtering can break standard PMTUD and black-hole traffic.

## Review Notes
- The post is now technically correct for current IPv6 PMTUD behavior as specified by RFC 8201.
- No live IPv6 path was available in this workspace. The review validated the Python snippets by executing equivalent code locally and validated the `tcpdump`/`awk` examples syntactically against the installed `tcpdump` 4.99.4 and libpcap 1.10.4 tooling rather than against real captured PTB traffic.
