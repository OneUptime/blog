# Validation Summary: How to Interpret the Total Length Field in IPv4 Packets

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv4
- Python 3
- Linux networking utilities (`ip`, `ping`, `tracepath`, `tcpdump`)
- Wireshark display filters

## Sources Consulted
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191
- Wireshark Display Filter Reference for IPv4 (`ip.len`): https://www.wireshark.org/docs/dfref/i/ip.html
- Local `ping(8)` and `tracepath(8)` man pages from installed `iputils 20240117`
- Local `pcap-filter(7)` and `tcpdump(8)` man pages from the installed `tcpdump 4.99.4` / `libpcap 1.10.4`

## Issues Found
- `validate_total_length()` only compared Total Length to the captured byte count. I added header-length checks so the example now rejects IPv4 headers shorter than 20 bytes and packets where `Total Length < IHL`.
- The `tracepath` comment said it "Displays MTU at each hop". `tracepath(8)` actually discovers path MTU and shows MTU changes along the route, so I corrected that wording.
- The `ping -M do` example used a specific `local error: message too long` output for a smaller path MTU. PMTU failures can be reported differently depending on where the limit is detected, so I replaced that with accurate general wording about PMTU discovery reporting the failure.
- The summary implied packets above a 1500-byte Ethernet MTU would always be fragmented. I corrected that to note they may instead be dropped when DF is set.
- `classify_packet_size()` labeled a 20-byte IPv4 packet as `ACK or probe`, which is incorrect because a TCP ACK still includes a TCP header. I changed it to `Header-only: no payload`.
- `classify_packet_size()` said packets up to 576 bytes "fit all IP paths safely". RFC 791/RFC 1191 do not guarantee that; 576 bytes is a conservative reassembly-size baseline, and some paths can still have smaller PMTUs. I corrected the classification text.
- The small-packet `tcpdump` example matched any 40-byte IPv4 packet but described it as a minimal TCP scan packet. I narrowed the filter to `tcp and ip[2:2] == 40` and updated the comment to match what it actually selects.

## Review Notes
- The command examples are Linux-specific and align with current `iputils`, `iproute2`, and `tcpdump` behavior.
- The Wireshark example uses a display filter (`ip.len > 1500`), not a libpcap capture filter.
- Jumbo-frame examples assume the interface and network path both support the configured MTU.
