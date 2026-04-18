# Validation Summary: How to Troubleshoot ISP Customer IPv6 Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- IPv6 (addressing, SLAAC, RA, link-local)
- DHCPv6 / DHCPv6-PD (prefix delegation)
- Kea DHCP server (MySQL lease backend)
- FreeRADIUS (radacct accounting, radtest)
- Cisco IOS / IOS-XE (DHCPv6 relay configuration)
- Cisco IOS-XR (ASR9K BNG subscriber CLI)
- Juniper Junos MX (DHCPv6 server binding, subscriber CLI)
- Linux networking tools (`ip -6`, `ping6`, `traceroute6`, `tcpdump`, `dhclient`, `dhcpcd`)
- macOS / Windows IPv6 diagnostic commands
- Mermaid flowchart diagrams

## Sources Consulted
- ISC Kea MySQL schema: https://github.com/isc-projects/kea/blob/master/src/share/database/scripts/mysql/dhcpdb_create.mysql
- Kea Administrator Reference Manual (lease6 schema, lease types IA_NA/IA_TA/IA_PD)
- Cisco IOS-XE "IPv6 Addressing and Basic Connectivity Configuration Guide" (`ipv6 dhcp relay destination`)
- Cisco IOS-XR "IP Addresses and Services Configuration Guide" for ASR 9000 (DHCPv6 relay profile)
- FreeRADIUS `radacct` schema (framedipv6prefix, delegatedipv6prefix columns)
- FreeRADIUS `radtest` command reference (protocol family flags)
- RFC 3315 / RFC 8415 (DHCPv6), RFC 3633 (DHCPv6-PD) — UDP ports 546 (client) / 547 (server)
- iputils `ping6`, `traceroute6` man pages
- ISC `dhclient` man page (`-6`, `-P` prefix delegation flags)
- Microsoft `route` command reference (`-6` flag)
- Cloudflare Public DNS IPv6 address (2606:4700:4700::1111)

## Issues Found
1. **Kea lease6 MySQL query — incorrect column names** (Step 1):
   - `prefixlen` does not exist in Kea's `lease6` table; the correct column is `prefix_len`.
   - `dhcp_identifier` does not exist in `lease6` either (that name is used in the `hosts` table). The correct column for the client DUID is `duid`.
   - Fixed the `SELECT` clause to use `prefix_len` and `duid`. Left `INET6_NTOA(address)` in place because Kea schema v19.0+ (Kea 2.4, 2023) stores `address` as `BINARY(16)`, which matches the current 2026 timeframe of the post.

2. **Cisco IOS-XR mislabel** (Step 6, Fix 2):
   - The snippet `interface Bundle-Ether1.100 / ipv6 dhcp relay destination ...` is Cisco IOS / IOS-XE syntax. IOS-XR (which runs on ASR9K) uses a different model: a global `dhcp ipv6` block with named relay profiles bound to subinterfaces. The per-interface `ipv6 dhcp relay destination` command is not valid on IOS-XR.
   - Relabeled the snippet comment to `Cisco IOS / IOS-XE`.

## Review Notes
- `ping6` is deprecated on modern Linux distributions in favor of `ping -6`, but the `ping6` symlink still ships with most iputils packages, so the commands work. Authors may want to migrate to `ping -6` in a future revision.
- The Cisco filter expression `show ipv6 dhcp binding | include "^Client\|Prefix\|Remaining"` uses unusual quoting and backslash-escaped pipes. Classic IOS regex treats `|` as alternation directly (no escape required) and quotes are not traditionally needed, but the command will still parse on most IOS releases. Left unchanged as it is functionally close to correct.
- `show subscriber session all filter username ...` on IOS-XR typically drops the `all` keyword when `filter` is used (`show subscriber session filter username <name> detail`). Left unchanged because `all` is tolerated on many IOS-XR releases and the intent is unambiguous.
- The mermaid flowchart is syntactically valid.
- Cloudflare DNS IPv6 address `2606:4700:4700::1111` and example DUID/prefix values (`2001:db8::/32`) are correct.
- FreeRADIUS `radtest -6` flag is supported on FreeRADIUS 3.0.14+ and 4.x.
