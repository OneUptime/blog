# Validation Summary: How to Set Up VLANs with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (Linux)
- Netplan (network configuration)
- systemd-networkd (renderer)
- IEEE 802.1Q VLANs
- `8021q` Linux kernel module
- `iproute2` (`ip` command)
- Linux bonding driver (active-backup mode)
- Linux bridge (with STP options)
- `tcpdump`
- Cisco IOS / Juniper Junos (ELS) switch configuration

## Sources Consulted
- Netplan reference documentation — https://netplan.readthedocs.io/en/stable/netplan-yaml/ (vlans, bonds, bridges, dhcp4-overrides keys)
- Linux kernel 802.1Q VLAN documentation — Documentation/networking/vlan.rst
- `ip-link(8)` and `ip-address(8)` man pages (iproute2)
- `tcpdump(1)` man page (`-e`, `vlan` filter)
- `ping(8)` man page (`-I` interface flag)
- Cisco IOS switchport trunk configuration reference
- Juniper Junos ELS ethernet-switching interface-mode trunk reference
- IEEE 802.1Q-2018 standard (VLAN ID range 1–4094, reserved 0 and 4095)

## Issues Found
No technical issues found.

Verified specifically:
- Netplan `vlans:` schema with `id` and `link` keys — correct.
- VLAN ID valid range stated as 1–4094 — correct (0 and 4095 are reserved by 802.1Q).
- `8021q` kernel module name and auto-load behavior on modern Ubuntu — correct.
- `dhcp4-overrides` keys `use-dns` and `use-routes` — valid Netplan keys.
- Bond `parameters` keys `mode: active-backup` and `mii-monitor-interval` — valid Netplan keys.
- Bridge `parameters` keys `stp` and `forward-delay` — valid Netplan keys.
- `ip -d link show <vlan-iface>` output format including `vlan protocol 802.1Q id N <REORDER_HDR>` — matches actual kernel output.
- `ip link show type vlan` filter syntax — valid.
- `ping -I <iface>` flag — correct.
- `tcpdump -i eth0 -e vlan` (`-e` prints link headers, `vlan` filter matches 802.1Q-tagged frames) — correct.
- Cisco trunk syntax (`switchport mode trunk` + `switchport trunk allowed vlan ...`) — correct.
- Juniper ELS trunk syntax (`family ethernet-switching interface-mode trunk` + `vlan members [...]`) — correct.
- `echo "8021q" | sudo tee -a /etc/modules` for persisting module load on Ubuntu — correct.

## Review Notes
- The Cisco example does not configure a native VLAN explicitly; in real Cisco deployments operators often set `switchport trunk native vlan <id>` and/or `switchport trunk encapsulation dot1q` (the latter only on platforms that support ISL). This is not incorrect for the post's purpose but is a future area for expansion.
- On very recent Netplan releases, the top-level `renderer:` and per-section overrides interact with `netplan.io` defaults — using `networkd` explicitly as the post does is the safest choice on Ubuntu Server.
- `netplan generate` is implicitly run by `netplan apply`, so `netplan generate && netplan apply` is redundant but harmless and arguably helpful for catching schema errors before applying.
