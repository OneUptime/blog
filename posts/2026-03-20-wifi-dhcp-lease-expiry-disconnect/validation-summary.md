# Validation Summary: How to Troubleshoot WiFi Disconnections Caused by DHCP Lease Expiry

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- DHCP (RFC 2131) — lease renewal mechanics (T1/T2 timers)
- ISC DHCP (`dhclient`, `dhcpd`, `isc-dhcp-server`)
- dnsmasq (DHCP server, lease file format, `dhcp-host` reservations)
- NetworkManager (`journalctl -u NetworkManager`)
- Windows `ipconfig /all`, Event Viewer
- `iptables` (UDP ports 67/68)
- `tcpdump` (DHCP packet capture)
- APIPA (169.254.0.0/16)

## Sources Consulted
- RFC 2131 (Dynamic Host Configuration Protocol) — T1 = 0.5 * lease, T2 = 0.875 * lease
- ISC `dhclient(8)` man page — https://man.archlinux.org/man/dhclient.8
- ISC `dhcpd.conf(5)` man page — scope rules for `default-lease-time` inside `host` blocks
- dnsmasq man page — https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html (dhcp-host syntax, lease duration suffixes `m`/`h`/`d`/`w`/`infinite`)
- Microsoft `ipconfig` documentation — lease fields in `/all` output
- `tcpdump(1)` man page — BPF filter syntax for port 67/68

## Issues Found
1. **Broken `dhclient` command**: The original Step 1 snippet used `dhclient -v -e 2>&1 | grep lease` to inspect current lease expiry. The `-e` flag in ISC dhclient requires a `VAR=value` argument (it sets environment variables for `dhclient-script`); invoking it without an argument fails and does not produce lease info. Replaced with `grep -E "expire|renew|rebind" /var/lib/dhcp/dhclient.leases`, which actually extracts the renew/rebind/expire timestamps from the lease file.

## Review Notes
- The lease-file path `/var/lib/dhcp/dhclient.leases` is accurate for standalone ISC `dhclient`. On systems where NetworkManager uses its internal nettools DHCP client (default since NM 1.20), lease state lives under `/var/lib/NetworkManager/` (e.g., `internal-*-<iface>.lease`). The post's guidance is still valid when the ISC client is in use; a future revision could mention the NetworkManager-internal path for completeness.
- T1 = 50% and T2 = 87.5% of lease time matches RFC 2131 §4.4.5.
- APIPA range 169.254.0.0/16 is correct (RFC 3927).
- ISC DHCPD `default-lease-time` / `max-lease-time` values (28800 s = 8h, 86400 s = 24h, 2592000 s = 30d) are arithmetically correct; placement of `default-lease-time` inside a `host` block is valid per dhcpd.conf scope rules.
- dnsmasq `dhcp-host=MAC,IP,30d` uses a valid lease-duration suffix per dnsmasq docs.
- DHCP renewal unicast-to-server behavior at T1, with fallback to broadcast REBINDING at T2, is accurate.
- UDP port 67 (server) / 68 (client) iptables rules are correct for bidirectional DHCP flow.
