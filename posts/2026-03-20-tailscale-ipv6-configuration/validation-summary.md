# Validation Summary: How to Configure Tailscale with IPv6

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Tailscale
- IPv6
- WireGuard
- Tailscale CLI
- Tailscale MagicDNS
- Tailscale exit nodes
- Tailscale subnet routers
- Linux networking and IP forwarding

## Sources Consulted
- Tailscale IPv6 support: https://tailscale.com/docs/concepts/ipv6
- How Tailscale assigns IP addresses: https://tailscale.com/docs/concepts/ip-and-dns-addresses
- Tailscale CLI reference: https://tailscale.com/docs/reference/tailscale-cli
- `tailscale up` command reference: https://tailscale.com/docs/reference/tailscale-cli/up
- Install Tailscale on Linux: https://tailscale.com/docs/install/linux
- Install Tailscale on Debian Bookworm: https://tailscale.com/docs/install/debian/debian-bookworm
- Tailscale exit nodes: https://tailscale.com/docs/features/exit-nodes
- Use exit nodes quick guide: https://tailscale.com/kb/1408/quick-guide-exit-nodes
- Tailscale subnet routers: https://tailscale.com/docs/features/subnet-routers
- MagicDNS: https://tailscale.com/docs/features/magicdns
- Quad100 DNS resolver: https://tailscale.com/docs/reference/quad100
- Tailscale connection types: https://tailscale.com/docs/reference/connection-types
- Tailscale device connectivity: https://tailscale.com/docs/reference/device-connectivity
- RFC 6598, IANA-Reserved IPv4 Prefix for Shared Address Space: https://datatracker.ietf.org/doc/html/rfc6598
- RFC 8200, Internet Protocol Version 6 specification: https://www.rfc-editor.org/rfc/rfc8200

## Issues Found
1. **Address range wording treated prefixes as device addresses.** Updated the address summary to say devices receive addresses from `100.64.0.0/10` and `fd7a:115c:a1e0::/48`, and replaced the example with valid Tailscale IPv4/IPv6-looking addresses.
2. **Manual Debian install commands were not the current documented form and were labeled for Ubuntu too.** Changed the comment to Debian Bookworm and replaced the hand-written `deb` line with Tailscale's documented `bookworm.tailscale-keyring.list` command.
3. **`sudo tailscale up --verbose` is not a documented `tailscale up` flag, and the IPv6 transport explanation needed a peer-connectivity caveat.** Replaced the command with `tailscale netcheck` for checking public IPv6 connectivity, clarified that public IPv6 transport applies when both peers have public IPv6 connectivity, and corrected the `tailscale status` example to use current columns and a valid bracketed IPv6 endpoint.
4. **Several IPv6 placeholders were syntactically invalid.** Replaced examples such as `fd7a:115c:a1e0::peer-address`, `fd7a:115c:a1e0::peer`, and `2001:db8:internal::/48` with valid IPv6 literals or documentation prefixes.
5. **Exit node configuration omitted required Linux forwarding and admin approval, and misdescribed LAN-access behavior as IPv6 routing.** Added the documented IPv4/IPv6 forwarding commands, switched partial setting changes to `tailscale set`, added an admin-console approval note, used a valid example Tailscale IP, and clarified that `--exit-node-allow-lan-access` controls client LAN access.
6. **IPv6 subnet routing omitted Linux IPv6 forwarding and used older `tailscale up` examples for changing settings.** Added IPv6 forwarding, changed route advertisement and route acceptance to `tailscale set`, and clarified that `--accept-routes` is needed on Linux clients.
7. **The dual-stack verification command used PeerAPI ping as an IPv6 connectivity test.** Replaced it with `ping -6` to test connectivity to the peer's Tailscale IPv6 address directly.

## Review Notes
- The central claims are accurate: Tailscale assigns every tailnet device a private IPv6 address from `fd7a:115c:a1e0::/48`, can use public IPv6 as transport when both peers have it, and fully supports IPv6-capable exit nodes.
- Tailscale's docs now prefer `tailscale set` for changing existing settings because it only updates explicitly provided settings; `tailscale up` remains valid for initial connection and authentication.
- MagicDNS and Quad100 behavior is correct, with `100.100.100.100` as the IPv4 device-local resolver and `fd7a:115c:a1e0::53` as its IPv6 equivalent.
