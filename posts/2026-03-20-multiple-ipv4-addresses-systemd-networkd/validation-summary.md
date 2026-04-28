# Validation Summary: How to Configure Multiple IPv4 Addresses with systemd-networkd

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- systemd-networkd (`.network` files)
- Linux IPv4 networking
- `networkctl` CLI
- `iproute2` (`ip addr`, `ip rule`, `ip route`)
- `curl` (`--interface` flag)
- DHCP (DHCPv4 client integration with static addresses)

## Sources Consulted
- systemd.network(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.network.html
- networkctl(1) man page — https://www.freedesktop.org/software/systemd/man/networkctl.html (verified `reload` verb, available since systemd 244)
- ip-address(8) man page — https://man7.org/linux/man-pages/man8/ip-address.8.html (verified `primary`/`secondary` filter flags, `add`/`del` syntax)
- ip-rule(8) man page — https://man7.org/linux/man-pages/man8/ip-rule.8.html (verified `from ... lookup` syntax)
- ip-route(8) man page — https://man7.org/linux/man-pages/man8/ip-route.8.html (verified `default via ... table` syntax)
- curl(1) man page — https://curl.se/docs/manpage.html (verified `--interface` accepts an IP address)

## Issues Found
No technical issues found.

All examples and commands verified against official documentation:
- `[Network]` section accepts multiple `Address=` entries — correct per systemd.network(5).
- `[Address]` section options (`Address=`, `Peer=`, `Broadcast=`, `Label=`, `Scope=`) are all documented and used with correct syntax/values. `Scope=` accepts `global`, `link`, `host`, or an unsigned integer; `link` is the right choice for the `169.254.0.0/16` link-local example.
- `Peer=` accepts the same `address/prefix` syntax as `Address=`, so `Peer=10.0.0.6/30` is valid.
- `networkctl reload` reloads `.network`, `.netdev`, and `.link` files — correct.
- `ip addr show eth0 primary` — `primary` is a valid filter flag in iproute2.
- `curl --interface 10.0.0.6` — `--interface` accepts an interface name, IP address, or hostname.
- DHCP=yes combined with static `Address=` lines results in the static address being assigned alongside the DHCP-acquired lease — behavior is as described.
- The "first Address is primary, subsequent are secondary" claim matches Linux kernel behavior (the kernel marks subsequent addresses in the same subnet on an interface as IFA_F_SECONDARY).

## Review Notes
- `Label=` for IPv4 addresses (e.g., `eth0:1`) is described as "legacy compat" in the post, which is accurate — interface alias labels are an older convention preserved primarily for tools that still parse them; modern tooling treats secondary addresses without labels as first-class.
- `Broadcast=` is indeed usually inferred from the prefix; explicitly setting it is rarely needed outside of unusual subnetting.
- The source-selection note ("Linux uses the primary address for outgoing connections by default") is a simplification — actual selection follows the rules in `ip-route(8)` (preferred source via `src` on routes, otherwise the address with matching scope on the egress interface). The example using `ip rule` + a custom routing table is the correct way to force a specific source for outgoing traffic.
- The post does not mention that `networkctl reload` only re-reads configuration; address removal of previously-applied addresses may require `networkctl reconfigure <iface>` in some edge cases. Not incorrect, just a useful caveat.
