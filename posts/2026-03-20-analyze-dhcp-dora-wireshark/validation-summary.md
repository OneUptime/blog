# Validation Summary: How to Analyze DHCP DORA Process with Wireshark

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Wireshark
- DHCP
- tcpdump
- libpcap capture filters
- DHCP packet analysis
- RFC 2131
- RFC 2132

## Sources Consulted
- Wireshark User's Guide, "Start Capturing": https://www.wireshark.org/docs/wsug_html_chunked/ChCapCapturingSection
- Wireshark User's Guide, "Building Display Filter Expressions": https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html
- Wireshark Display Filter Reference: Dynamic Host Configuration Protocol: https://www.wireshark.org/docs/dfref/d/dhcp.html
- Wireshark Display Filter Reference: Ethernet: https://www.wireshark.org/docs/dfref/e/eth.html
- Wireshark 3.0.0 Release Notes: https://www.wireshark.org/docs/relnotes/wireshark-3.0.0.html
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132.html
- `pcap-filter(7)` local man page
- `tcpdump --help` local CLI output

## Issues Found
- The post used deprecated `bootp.*` Wireshark display filters. I updated the examples and summary to the current `dhcp.*` equivalents because Wireshark 3.0 renamed the dissector and marks `bootp.*` as deprecated.
- The `tcpdump` capture example used `port 67 or port 68`, which matches multiple transport protocols in libpcap syntax. I narrowed it to `udp port 67 or udp port 68` so it targets DHCP traffic specifically.
- The MAC-address troubleshooting filter used `eth.src`, which only matches source Ethernet MAC addresses and can miss server replies. I replaced it with `dhcp.hw.mac_addr` so the filter follows the client across the full DHCP exchange.
- The DORA direction table implied Offer and Acknowledge are always direct server-to-client packets. I updated those rows to reflect that RFC 2131 allows broadcast or unicast delivery depending on the broadcast flag and client state.
- The troubleshooting filter block was labeled as `bash` even though it contains Wireshark display filters. I changed it to `text`.
- The ACK/NAK wording was normalized to `DHCPACK` and `DHCPNAK` for protocol accuracy.

## Review Notes
- Older `bootp.*` filters may still work as aliases in some Wireshark versions, but current Wireshark documentation treats them as deprecated and subject to future removal.
- DHCP Offer and ACK packets may appear as either broadcast or unicast in captures, so readers should expect both forms when analyzing real traffic.
