# Validation Summary: How to Configure Static IPv6 Addresses on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking on Linux
- iproute2 (`ip` command, specifically `ip -6 addr` and `ip -6 route`)
- Netplan (Ubuntu)
- NetworkManager (`nmcli` and `.nmconnection` files, RHEL/CentOS)
- Debian legacy `/etc/network/interfaces` (ifupdown)
- systemd-networkd (`.network` units)
- `ping6` / `ping -6`
- IPv6 address scopes (global unicast, ULA fd00::/8, link-local fe80::/10)
- IPv6 address lifetimes (`preferred_lft`, `valid_lft`)

## Sources Consulted
- iproute2 `ip-address(8)` and `ip-route(8)` man pages (kernel.org)
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/ (deprecation of `gateway4`/`gateway6` in favour of `routes:`)
- NetworkManager `nm-settings-nmcli(5)` and `nm-settings-keyfile(5)` man pages
- systemd `systemd.network(5)` man page (freedesktop.org)
- Debian `interfaces(5)` man page
- RFC 4291 (IPv6 Addressing Architecture) — IPv6 textual representation uses hex digits 0–9, a–f only
- RFC 4193 (Unique Local IPv6 Unicast Addresses) — fd00::/8 ULA range
- RFC 4862 / RFC 8200 — IPv6 address lifetimes (preferred / valid)
- 2001:db8::/32 documentation prefix per RFC 3849

## Issues Found
1. **Invalid IPv6 addresses in the static route example.** The original line used `2001:db8:remote::/48` and `2001:db8::gateway`, but IPv6 addresses may only contain hexadecimal characters (0–9, a–f) per RFC 4291. The strings "remote" and "gateway" contain characters (`r`, `m`, `o`, `t`, `g`, `w`, `y`) that are not valid hex, so these examples would be rejected by the `ip` command. Replaced with valid documentation-prefix addresses: `2001:db8:1234::/48` and `2001:db8::1`.

2. **Deprecated Netplan keys `gateway4` / `gateway6`.** These keys have been deprecated since Netplan 0.103 (released October 2021) and emit warnings on current Ubuntu releases (22.04+). Replaced with the recommended `routes:` syntax using `to: default` for IPv4 and `to: "::/0"` for IPv6, which is the format documented in the current Netplan reference.

## Review Notes
- `ping6` is still provided on most distros via the iputils package, but on modern systems the unified `ping` command auto-selects the address family, and `ping -6` is the more current invocation. The post's use of `ping6` still works and was left unchanged.
- The Debian legacy `ifupdown` example (`/etc/network/interfaces`) is correct, but `ifupdown` is no longer installed by default on recent Debian/Ubuntu releases — readers on those systems will need to install the `ifupdown` package or use one of the other persistent methods shown.
- Setting a custom link-local with `ip -6 addr add fe80::1/64 dev eth0 scope link` is syntactically valid and accepted by the kernel; in practice the auto-generated EUI-64 link-local will also remain on the interface. This is technically accurate as written.
- The `[Network]` section's `Gateway=` directive in systemd-networkd remains supported (not deprecated); explicit `[Route]` sections are an alternative but not required for a simple default gateway.
