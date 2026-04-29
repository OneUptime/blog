# Validation Summary: How to Configure IPv6 ND (Neighbor Discovery) on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MikroTik RouterOS (6.40+ and 7.x)
- IPv6
- IPv6 Neighbor Discovery Protocol (NDP)
- Router Advertisements (RA) / SLAAC
- DHCPv6 Server
- IPv6 Firewall
- IPv6 Routing
- Winbox GUI
- /tool torch

## Sources Consulted
- [MikroTik RouterOS Documentation - IPv6 Neighbor Discovery](https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6+Neighbor+Discovery)
- [MikroTik RouterOS Documentation - WinBox](https://help.mikrotik.com/docs/spaces/ROS/pages/328129/WinBox)
- [MikroTik RouterOS Documentation - Torch](https://help.mikrotik.com/docs/spaces/ROS/pages/8323150/Torch)
- [MikroTik RouterOS Documentation - IPv4 and IPv6 Fundamentals](https://help.mikrotik.com/docs/spaces/ROS/pages/119144661/IPv4+and+IPv6+Fundamentals)
- MikroTik community forum threads on IPv6 ND parameters and Winbox menu structure

## Issues Found

1. **Incorrect parameter name in `/ipv6 nd add` command**: The command used `dns=2001:4860:4860::8888`, but the correct RouterOS parameter is `dns-servers`. The official RouterOS IPv6 ND documentation lists `dns-servers` (not `dns`) as the parameter that specifies IPv6 addresses to advertise as DNS resolvers. Changed `dns=` to `dns-servers=` in the SLAAC RA configuration example.

2. **Incorrect Winbox GUI menu paths**: The post listed IPv6 menu paths under the IPv4 `IP` menu (e.g., `IP → IPv6 Addresses`, `IP → IPv6 Routes`, `IP → Firewall → IPv6`). In RouterOS Winbox, IPv6 has its own dedicated top-level menu (visible when the IPv6 package is enabled), not nested under `IP`. Updated to:
   - `IPv6 → Addresses`
   - `IPv6 → Routes`
   - `IPv6 → Firewall`
   - `IPv6 → ND` (already correct)

## Review Notes

- The DHCPv6 server example uses `interface=bridge`, which assumes the user has a bridge named `bridge`. This is a common RouterOS default but worth noting.
- The placeholder addresses such as `2001:db8:wan::254`, `2001:db8:remote::/48`, and `2001:db8:lan::/64` use non-hexadecimal labels (`wan`, `remote`, `lan`) inside IPv6 segments. These are clearly intended as descriptive placeholders the reader should replace with their own valid hex segments before pasting; they will not parse if used verbatim. Left in place as the author's stylistic convention but readers should substitute valid hex (e.g., `2001:db8:1::/48`).
- `/ipv6 nd` entries can be created with `add` (per-interface) or modified on the default `interface=all` entry with `set`. The post uses `add`, which is valid.
- The conclusion contains a duplicated phrase ("How to Configure IPv6 ND (Neighbor Discovery) on MikroTik on MikroTik RouterOS") — this is a stylistic/editorial issue, not a technical error, so it was left untouched per review guidelines.
- For RouterOS 7.x, the IPv6 package is built into the main system package and the `/system package enable ipv6` step (and reboot) is only needed on RouterOS 6.x. The post is otherwise version-aware.
- ICMPv6 firewall rule example correctly uses `protocol=icmpv6`, which is the valid RouterOS protocol name.
