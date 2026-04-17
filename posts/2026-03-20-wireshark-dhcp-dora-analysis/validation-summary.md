# Validation Summary: How to Analyze DHCP Discover/Offer/Request/Acknowledge in Wireshark

## Status
validated

## Post Type
Tutorial / Guide (packet-analysis walkthrough)

## Technologies Covered
- Wireshark (display filters, DHCP/BOOTP dissector)
- DHCP protocol (DORA: Discover / Offer / Request / Acknowledge; NAK)
- tcpdump (capture)
- ISC dhclient (Linux DHCP client)
- Windows `ipconfig` (release/renew)
- BPF capture filter syntax
- DHCP options (RFC 2132)
- APIPA (169.254.0.0/16)

## Sources Consulted
- RFC 2131 — Dynamic Host Configuration Protocol: https://datatracker.ietf.org/doc/html/rfc2131 (BOOTP message format, ports 67/68, DORA state machine)
- RFC 2132 — DHCP Options and BOOTP Vendor Extensions: https://datatracker.ietf.org/doc/html/rfc2132 (options 1, 3, 6, 15, 51, 54, 58; DHCP message type option 53 values)
- Wireshark 3.0.0 release notes: https://www.wireshark.org/docs/relnotes/wireshark-3.0.0.html (documents the `bootp` → `dhcp` dissector rename and alias preservation)
- Wireshark DHCP display filter reference: https://www.wireshark.org/docs/dfref/d/dhcp.html
- tcpdump(1) man page: https://www.tcpdump.org/manpages/tcpdump.1.html
- dhclient(8) man page (ISC) for `-r` (release) and renewal behavior

## Issues Found
1. **Outdated Wireshark filter name (`bootp` → `dhcp`).** The post used `bootp`, `bootp.option.dhcp`, `bootp.hw.mac_addr`, and `bootp.type` throughout. In Wireshark 3.0 (Feb 2019) the BOOTP dissector was renamed to DHCP, making `dhcp.*` the canonical filter. The old `bootp.*` fields remain as backward-compatibility aliases. Replaced all filter references with `dhcp.*` and added a one-line note that `bootp.*` still works as an alias.
2. **Incorrect description of `bootp.type == 1`.** The post claimed this means "Only DHCP messages," which is wrong. `dhcp.type` (the BOOTP `op` field) is 1 = BOOTREQUEST (client-to-server) and 2 = BOOTREPLY (server-to-client), per RFC 2131 §2. Corrected the line to describe BOOTREQUEST vs BOOTREPLY and added the `dhcp.type == 2` counterpart.
3. Updated the Conclusion paragraph and the Step 6 timing filter (`frame.time_delta > 0.5 and bootp`) to match the new `dhcp` naming.

## Review Notes
- DHCP message type codes (1 Discover, 2 Offer, 3 Request, 5 ACK, 6 NAK) verified against RFC 2132 §9.6 — correct.
- DHCP option numbers (1, 3, 6, 15, 51, 54, 58) verified against RFC 2132 — all correct.
- DHCP ports (UDP 67 server, UDP 68 client) per RFC 2131 §4.1 — correct.
- BPF capture filter `port 67 or port 68` is valid syntax.
- `sudo dhclient -r eth0 && sudo dhclient eth0` is correct ISC dhclient usage.
- The Discover/Offer/Request/ACK broadcast/unicast descriptions correctly reflect RFC 2131 behavior, including that Offer and ACK can be broadcast or unicast depending on the BROADCAST flag in the client's request.
- Renewal time of 43200s (T1 = 0.5 × lease) matches RFC 2131 defaults.
- Minor stylistic observation (not fixed, not incorrect): `dhcp.option.dhcp` is the Wireshark alias for DHCP option 53 (Message Type); readers grepping official docs may also see `dhcp.option.dhcp_server_id` and related option-specific fields, but the values shown in the post are accurate.
