# Validation Summary: How to Configure NAT on MikroTik Routers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MikroTik RouterOS
- Winbox GUI
- RouterOS CLI / terminal
- NAT (Source NAT / Destination NAT / Masquerade / Hairpin NAT / 1:1 NAT)
- IPv4 firewall

## Sources Consulted
- MikroTik official documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/3211299/NAT
- MikroTik wiki / help pages on `/ip firewall nat` syntax (chains, actions, properties)
- MikroTik documentation on hairpin NAT configuration
- General RouterOS CLI reference for `print stats` and `print count-only` modifiers

## Issues Found
No technical issues found.

All RouterOS commands, parameter names, and chains were verified against the official MikroTik documentation:

- Chain names `srcnat` and `dstnat` are correct.
- Action names `masquerade`, `dst-nat`, and `src-nat` (with hyphens) are correct.
- Property names `to-addresses`, `to-ports`, `in-interface`, `out-interface`, `src-address`, `dst-address`, `dst-port`, `protocol`, and `comment` are all valid.
- `/ip firewall nat remove [find]` is a valid idiom for removing all NAT rules.
- `/ip firewall nat print stats` and `/ip firewall connection print count-only` are valid RouterOS print modifiers.
- The hairpin NAT example follows the standard MikroTik approach (DNAT for incoming-from-LAN traffic + masquerade for return-path symmetry on the LAN-facing interface).
- The Winbox path `IP → Firewall → NAT` is correct.

## Review Notes
- The Static NAT (1:1) rules omit `in-interface` / `out-interface`. This is technically valid (the rule will match regardless of interface), but in production it is generally safer to scope these rules to the WAN interface to avoid unintended matches.
- The hairpin NAT masquerade rule scopes both `src-address` and `dst-address` precisely; many guides recommend the simpler form `src-address=192.168.1.0/24 dst-address=192.168.1.0/24 out-interface=<LAN>` to cover all internally-hosted services. Both approaches work — the post's version is just more specific.
- `MASQUERADE` should be reserved for dynamic-IP WAN connections; for static public IPs, `action=src-nat to-addresses=<public-ip>` is more efficient (avoids per-disconnect connection tracking flushes). The post correctly demonstrates both forms.
