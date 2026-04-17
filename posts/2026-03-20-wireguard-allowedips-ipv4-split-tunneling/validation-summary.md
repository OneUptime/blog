# Validation Summary: How to Configure WireGuard AllowedIPs for IPv4 Split Tunneling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard (VPN)
- Linux networking (`ip route`)
- IPv4 CIDR / RFC 1918 private address space
- `wg-quick` configuration (`/etc/wireguard/wg0.conf` INI format)

## Sources Consulted
- WireGuard official documentation — Cryptokey Routing & AllowedIPs semantics: https://www.wireguard.com/
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- `wg(8)` and `wg-quick(8)` man pages
- RFC 1918 (Address Allocation for Private Internets): https://datatracker.ietf.org/doc/html/rfc1918
- Pro Custodibus WireGuard AllowedIPs Calculator: https://www.procustodibus.com/blog/2021/03/wireguard-allowedips-calculator/
- PyPI lookup for `wg-allowed-ips` (returned HTTP 404 — package does not exist)

## Issues Found
- **Non-existent Python package**: The post recommended `pip install wg-allowed-ips` and a `wg-allowed-ips 0.0.0.0/0 !192.168.1.0/24` CLI invocation. A direct PyPI API check (`https://pypi.org/pypi/wg-allowed-ips/json`) returned HTTP 404, confirming no such package exists. Replaced the install/CLI snippet with a reference to the well-known online Pro Custodibus AllowedIPs calculator and a description of how to use it to produce the complement CIDR list.

## Review Notes
- The dual-purpose description of `AllowedIPs` (outbound = routing table, inbound = ACL / cryptokey routing) matches WireGuard's official cryptokey-routing model.
- The split-tunnel and full-tunnel `[Interface]` / `[Peer]` snippets are syntactically valid `wg-quick` INI and use safe documentation address ranges (`203.0.113.0/24` from RFC 5737, RFC 1918 ranges).
- `PersistentKeepalive = 25` is the canonical recommended value for keeping NAT mappings alive.
- The expected `ip route show dev wg0` output is plausible: `wg-quick` installs link-scope routes for AllowedIPs CIDRs not already covered by the interface address, and the kernel installs the `proto kernel scope link` route for the interface's own subnet. Exact formatting may vary slightly between iproute2 versions but the example is representative.
- Future improvement (non-blocking): mention that for full tunnels (`AllowedIPs = 0.0.0.0/0`), `wg-quick` uses policy routing (table 51820 + `fwmark`) rather than installing a literal `0.0.0.0/0` route into the main table — useful context for users debugging routing.
