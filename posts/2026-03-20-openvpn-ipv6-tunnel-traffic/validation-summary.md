# Validation Summary: How to Configure OpenVPN for IPv6 Tunnel Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenVPN (server and client configuration)
- IPv6 (ULA prefixes, documentation prefix `2001:db8::/32`)
- Linux networking (`ip -6`, `sysctl net.ipv6.conf.all.forwarding`)
- `ip6tables` (NAT66/MASQUERADE, FORWARD rules)
- DNS over IPv6 (`dhcp-option DNS6`)
- OpenVPN scripting hooks (`script-security`, `up`, `down`)
- Diagnostic tools: `ping6`, `tcpdump`, `curl -6`

## Sources Consulted
- [OpenVPN Community Wiki — IPv6](https://community.openvpn.net/Pages/IPv6) (server-ipv6 directive, tun-ipv6 deprecation since 2.4)
- [OpenVPN IPv6 minimal configuration — 4sysops](https://4sysops.com/archives/openvpn-ipv6-minimal-configuration/) (server-ipv6 syntax with /64)
- [APNIC: Using OpenVPN with IPv6](https://blog.apnic.net/2017/06/09/using-openvpn-ipv6/) (push route-ipv6, dual-stack patterns)
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- RFC 4193 (Unique Local IPv6 Unicast Addresses, `fd00::/8`)

## Issues Found
- **Invalid IPv6 placeholder addresses (3 occurrences).** The post used memorable-but-invalid hex labels. The characters `v`, `p`, `n`, `i`, `t`, `e`, `r`, `s` are not valid hexadecimal digits, so any reader copy-pasting these would get parser errors from OpenVPN, `ip6tables`, and `ip -6`. Fixed:
  - `server-ipv6 fd00:vpn::/64` → `server-ipv6 fd00:abcd:1::/64`
  - `ip6tables -t nat ... -s fd00:vpn::/64 ! -d fd00:vpn::/64` → updated to `fd00:abcd:1::/64` on both ends
  - Verification comments referencing `fd00:vpn::X` and `fd00:vpn::1` updated to the new prefix
  - `push "route-ipv6 2001:db8:internal::/48"` → `push "route-ipv6 2001:db8:1::/48"` (keeps the RFC 3849 documentation prefix)
  - `push "route-ipv6 fd00:services::/64"` → `push "route-ipv6 fd00:abcd:2::/64"`

## Review Notes
- `tun-ipv6` in the client config is technically deprecated since OpenVPN 2.4 — IPv6-on-tun is enabled by default — but it remains accepted as a no-op, so it does not break the configuration. Left as-is to avoid stylistic edits.
- `dhcp-option DNS6` is honored by most OpenVPN client platforms; modern OpenVPN also accepts `dhcp-option DNS <ipv6>` on dual-stack capable clients, but `DNS6` is fine and explicit.
- `ping6` is deprecated on recent iputils in favor of `ping -6` / unified `ping`, but still ships and works on virtually every common distro.
- The `up`/`down` scripts use `$dev`, which OpenVPN exports to script environments — correct usage.
- NAT66 with `MASQUERADE` works but is generally discouraged in production IPv6 deployments in favor of routed prefixes (e.g., from `prefix-ipv6` / DHCPv6-PD). Acceptable for the tutorial's stated scope.
