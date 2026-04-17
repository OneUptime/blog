# Validation Summary: How to Configure WireGuard Dual-Stack Tunnels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard (wg-quick, wg)
- IPv4 and IPv6 (dual-stack networking)
- Linux networking (iptables, ip6tables, ip, ping, curl)
- IPv6 ULA (fc00::/7) and documentation prefix (2001:db8::/32)

## Sources Consulted
- wg-quick(8) man page — https://man7.org/linux/man-pages/man8/wg-quick.8.html
- wg(8) man page — https://man7.org/linux/man-pages/man8/wg.8.html
- WireGuard official site — https://www.wireguard.com/quickstart/
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- RFC 4193 — Unique Local IPv6 Unicast Addresses (ULA, `fc00::/7`)
- iputils documentation (ping / ping6)

## Issues Found
- **Invalid hex in IPv6 addresses.** The post used `fd00:wg::/64`, `fd00:wg::2/64`, `fd00:wg::2/128`, and `fd00:internal::/48`. The characters `w`, `g`, `i`, `n`, `t`, `r`, `l` are not valid hex digits, so these addresses would fail to parse with `ip addr add` and `wg-quick up` would error. Replaced all occurrences with the valid ULA example prefix `fd00:abcd::/64` (and `fd00:abcd::/48` for the /48 split-tunnel example).
- **Server IPv6 address missing host part.** The server `[Interface]` had `Address = fd00:wg::/64`, which is the subnet/network address rather than a host address. Corrected to `fd00:abcd::1/64` following the standard WireGuard convention (mirrors the `10.0.0.1/24` IPv4 side).
- **Invalid hex in IPv6-only server Endpoint example.** `[2001:db8::vpn-server]:51820` contained non-hex characters. Replaced with `[2001:db8::1]:51820` (using the RFC 3849 documentation prefix correctly).
- **Deprecated `ping6` command.** Modern iputils has merged `ping6` into `ping`; `ping6` survives only as a backward-compat symlink on most distros. Changed `ping6 -c 3 ...` to `ping -6 -c 3 ...` in the verification section.

## Review Notes
- MASQUERADEing ULA IPv6 traffic (`fd00:abcd::/64`) out to the public Internet works technically but is an unusual deployment: ULA is meant for internal-only use, and IPv6 typically uses GUA (globally routed) addresses rather than NAT. Readers with an ISP-assigned IPv6 prefix should prefer GUA addressing on the tunnel and drop the `ip6tables ... MASQUERADE` rule. Kept as-written since it is a valid (if unconventional) configuration and the post's focus is dual-stack mechanics.
- The post does not mention enabling IP forwarding (`net.ipv4.ip_forward=1`, `net.ipv6.conf.all.forwarding=1`), which is required for the server to route client traffic. Not an error (the post scopes itself to dual-stack specifics) but worth flagging for a future edit.
- Multiple `AllowedIPs =` directives in a `[Peer]` section accumulate per wg(8); the split-tunnel example is valid. The final "Separate by comma" line in that block is slightly redundant but demonstrates the equivalent single-line form, which is useful.
- `PersistentKeepalive = 25` is the commonly recommended value behind NAT and is correct.
