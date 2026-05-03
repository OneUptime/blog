# Validation Summary: How to Debug DHCPv6 with tcpdump

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- tcpdump (CLI packet capture)
- DHCPv6 (RFC 8415)
- IPv6 (link-local addressing, multicast)
- BPF filter expressions
- ISC dhclient (`-6` IPv6 mode)
- systemd-networkd (`networkctl`)

## Sources Consulted
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
  - Section 5.2 (Four-Message Exchange)
  - Section 7.1 / IANA assignments (multicast address naming)
  - Section 18.2.2 (Creation and Transmission of Request Messages)
  - Section 18.4 (Reception of Unicast Messages — Server Unicast option behavior)
- tcpdump 4.99.4 man page (verified `-i`, `-n`, `-v`, `-vvv`, `-w`, `-r` flags)
- `networkctl --help` output (verified `up`/`down` subcommands exist in systemd-networkd)
- IANA IPv6 Multicast Address registry (confirmed `ff02::1:2` = All_DHCP_Relay_Agents_and_Servers)

## Issues Found
- **Multicast address name**: A code comment labeled `ff02::1:2` as "All-DHCPv6-Servers multicast". Per RFC 8415 and the IANA IPv6 multicast address registry, the official name is `All_DHCP_Relay_Agents_and_Servers` (it includes relay agents, not only servers; the site-scoped `ff05::1:3` is the separate "All_DHCP_Servers"). Updated the comment to use the correct RFC name.

No other technical issues were found:
- UDP port 546 (client) / 547 (server) assignments are correct.
- The Solicit → Advertise → Request → Reply (SARR) exchange description is correct.
- All tcpdump flags (`-i`, `-n`, `-v`, `-vvv`, `-w`, `-r`) match the man page.
- The BPF filter syntax (`udp port 546 or udp port 547`, `ip6 and ... and host fe80::...`) is valid.
- `dhclient -6 -r <iface>` (release) and `dhclient -6 <iface>` (request) are correct ISC dhclient invocations for DHCPv6.
- `networkctl down`/`networkctl up` are valid systemd-networkd commands.
- The `-i any` caveat about link-local addresses is accurate.
- DUID, IA_NA, and IA_PD are correctly identified as DHCPv6 option contents shown by `-vvv`.

## Review Notes
- The sample output shows the Request message as unicast (`fe80::aabb:ccff:fedd:1234.546 > fe80::1.547`). Per RFC 8415 §18.4, by default a client sends Request to the `ff02::1:2` multicast address; unicast Request is only valid if the server has previously sent a Server Unicast option (§21.12). The depicted unicast Request is therefore atypical for the default case but not strictly wrong (it represents a valid Server-Unicast-enabled deployment), so it was left as-is.
- The "Server unreachable for Renew" troubleshooting row is consistent with RFC behavior — Renew is unicast to the server, with Rebind (multicast to `ff02::1:2`) as the documented fallback.
- Timestamps in the sample output are shown to millisecond precision (`12:00:01.001`); real tcpdump output is typically microsecond precision (`12:00:01.001234`), but this is a minor presentation choice and not incorrect.
