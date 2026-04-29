# Validation Summary: How to Modify an Existing Connection with nmcli

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nmcli (NetworkManager command-line interface)
- NetworkManager
- Linux networking (IPv4, DNS, gateways, MTU, interface bindings)

## Sources Consulted
- nmcli(1) man page (https://networkmanager.dev/docs/api/latest/nmcli.html)
- nm-settings(5) man page (https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html) — for property names like `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`, `ipv4.method`, `connection.interface-name`, `connection.autoconnect`, `connection.id`, `ethernet.mtu`
- NetworkManager Reference Manual on connection property modification semantics (`+`/`-` prefixes for append/remove)
- Red Hat / Fedora documentation on configuring network connections with nmcli

## Issues Found
No technical issues found.

All commands, property names, and value formats verified against official NetworkManager documentation:
- `nmcli connection modify <con-name> <property> <value>` syntax is correct.
- `ipv4.addresses` accepts CIDR notation (e.g., `10.0.0.20/24`) — correct.
- `ipv4.dns` accepts space-separated DNS server list — correct.
- `ipv4.method manual` / `ipv4.method auto` are valid values; clearing addresses/gateway with empty strings when switching to DHCP is the documented approach.
- `connection.autoconnect yes`/`no` are valid; `true`/`false` also accepted.
- `connection.id` is the correct property for renaming a connection.
- `ethernet.mtu` is the correct property name (not `802-3-ethernet.mtu` in nmcli's alias form, but both work; the post uses the standard alias).
- The `+`/`-` prefix semantics described in the conclusion are accurate per `nm-settings-nmcli(5)`.
- `nmcli connection up` is required to activate stored changes — correct.

## Review Notes
- The `ipv4.dns` property also accepts comma-separated values; the post's space-separated form is valid and matches the typical nmcli convention.
- For `connection.autoconnect`, NetworkManager accepts `yes`/`no`/`true`/`false`/`on`/`off` — the `yes`/`no` form used here is the most idiomatic for nmcli.
- The grep in the "Verify Changes" section (`grep ipv4`) is case-sensitive; this works because `nmcli connection show` outputs properties in lowercase, so no change needed.
- When switching from static back to DHCP, clearing `ipv4.addresses` and `ipv4.gateway` is good practice as shown; some users may also want to clear `ipv4.dns` if static DNS was set.
- Post does not cover IPv6 equivalents (`ipv6.addresses`, etc.), but this is a stylistic scope choice rather than a technical error.
