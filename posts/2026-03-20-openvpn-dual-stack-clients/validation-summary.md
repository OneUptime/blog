# Validation Summary: How to Configure OpenVPN with Dual-Stack Client Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenVPN (server and client configuration, dual-stack)
- IPv4 and IPv6 (ULA prefixes, documentation prefix `2001:db8::/32`)
- OpenVPN directives: `proto udp6`, `server`, `server-ipv6`, `tun-ipv6`, `push redirect-gateway`, `push route-ipv6`, `dhcp-option DNS`/`DNS6`, `client-config-dir`, `ifconfig-push`, `ifconfig-ipv6-push`
- Linux diagnostic tools: `ip addr`, `ping`, `ping6`, `curl`
- systemd / `journalctl` for OpenVPN logs
- Happy Eyeballs (RFC 8305)

## Sources Consulted
- [OpenVPN Community Wiki — IPv6](https://community.openvpn.net/Pages/IPv6) (`server-ipv6`, `tun-ipv6`, dual-stack listening on `udp6`)
- [OpenVPN 2.x manpage](https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/) (`remote <host> <port> <proto>` syntax, `connect-retry`, `connect-retry-max`, `client-config-dir`, `ifconfig-ipv6-push`)
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- RFC 4193 (Unique Local IPv6 Unicast Addresses, `fd00::/8`)
- RFC 8305 (Happy Eyeballs Version 2)

## Issues Found
- **Invalid IPv6 placeholder addresses (4 occurrences).** The post used the label `vpn` inside IPv6 addresses, but `v`, `p`, and `n` are not valid hexadecimal digits. Any reader copy-pasting these values would get parser errors from OpenVPN. Fixed:
  - `server-ipv6 fd00:vpn:1::/64` → `server-ipv6 fd00:abcd:1::/64` (in main `server.conf` and `server-ipv4.conf` sections)
  - `local 2001:db8::vpn` → `local 2001:db8::1` (RFC 3849 documentation prefix with valid hex host part)
  - `server-ipv6 fd00:vpn:2::/64` → `server-ipv6 fd00:abcd:2::/64` (in `server-ipv6.conf`)
  - `ifconfig-ipv6-push fd00:vpn:1::10/64` → `ifconfig-ipv6-push fd00:abcd:1::10/64`

## Review Notes
- `tun-ipv6` is technically deprecated since OpenVPN 2.4 (IPv6-on-tun is on by default), but it remains accepted as a no-op, so it does not break the configuration. Left as-is to avoid stylistic edits.
- `ping6` is deprecated on recent iputils in favor of `ping -6` / unified `ping`, but still ships and works on virtually every common distro.
- The `remote` directive's third argument accepts `udp`, `udp4`, `udp6`, `tcp-client`, `tcp4-client`, `tcp6-client`. Using `udp` for the IPv4 fallback is accepted; `udp4` would be more explicit, but `udp` is not technically wrong.
- `ifconfig-push 10.8.0.10 10.8.0.9` uses the net30 topology pair-form. With `server 10.8.0.0 255.255.255.0` (which uses `topology net30` by default in older OpenVPN releases and `topology subnet` in 2.5+), the syntax is consistent with the legacy default. Newer deployments using `topology subnet` would write `ifconfig-push 10.8.0.10 255.255.255.0`. Acceptable as-is for the tutorial scope.
- `grep "TCP\|UDP"` uses BRE alternation correctly.
- Dual-stack listening via `proto udp6` relies on the kernel accepting IPv4-mapped IPv6 addresses (`IPV6_V6ONLY=0`), which is the default on Linux. Correct as described.
