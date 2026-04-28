# Validation Summary: How to Configure Static IPv6 with Netplan

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Netplan (YAML-based network configuration)
- IPv6 (static addressing, default routes, DNS)
- Ubuntu / Debian Linux
- systemd-networkd / NetworkManager backends
- iproute2 (`ip` command)
- `ping6`, `dig`

## Sources Consulted
- Netplan official documentation: https://netplan.readthedocs.io/en/latest/
- Netplan reference (configuration format): https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Ubuntu Netplan tutorial: https://ubuntu.com/server/docs/network-configuration
- RFC 4291 (IP Version 6 Addressing Architecture) — valid IPv6 hex characters
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation) — `2001:db8::/32`
- iproute2 `ip` command manual (man ip-address, man ip-route)

## Issues Found
1. **Duplicate `addresses:` key in Step 2 (Configure Static IPv6)**: The original YAML had two `addresses:` keys under the same `eth0:` mapping — one for IPv4 and a second for the combined list. YAML mapping keys must be unique; duplicate keys are invalid per the YAML spec and will either be rejected by strict parsers or silently overridden (last-wins) by lenient ones. Fixed by collapsing into a single `addresses:` list that contains both IPv4 and IPv6 entries.

2. **Invalid IPv6 addresses in Server-Side Configuration Example**: The original used `2001:db8:server::10/64` and `2001:db8:server::1`. IPv6 address segments are hexadecimal (0–9, a–f only), so `s`, `r`, and `v` are invalid characters. Replaced with `2001:db8:abcd::10/64` and `2001:db8:abcd::1`, which use only valid hex digits while still being inside the `2001:db8::/32` documentation prefix (RFC 3849).

## Review Notes
- `ping6` is technically deprecated on modern Linux distributions (iputils now prefers `ping -6` or `ping` with a literal IPv6 destination), but `ping6` remains available as a symlink/wrapper on Ubuntu and Debian, so the examples still work.
- Manually configuring a custom link-local address (`fe80::1/64`) is correctly labeled as optional. In most environments the kernel auto-generates link-local addresses; overriding them is rarely needed and can interfere with neighbor discovery if duplicates exist on the segment. The post's "Optional" caveat is appropriate.
- The post does not mention `netplan generate` or accept-ra/ip-forwarding settings, but these are out of scope for a basic static IPv6 tutorial.
- File-numbering convention (`01-netcfg.yaml` vs `50-cloud-init.yaml`) is correctly noted — Netplan reads files in lexicographical order and merges them, with later files overriding earlier ones.
- Documentation prefixes (`2001:db8::/32`, `192.168.1.0/24`, `203.0.113.0/24`) used throughout are appropriate per RFC 3849 / RFC 5737.
