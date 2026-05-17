# Validation Summary: How to Set Up Multiple Interfaces with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (modern releases using Netplan)
- Netplan (YAML-based network configuration)
- systemd-networkd (renderer)
- Linux predictable network interface naming (systemd.net-naming-scheme)
- Linux policy-based routing (iproute2 / rule tables)
- iproute2 utilities (`ip`, `ip route`, `ip link`)
- `ethtool`, `networkctl`, `netstat`, `iftop`, `ping` diagnostic tools

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan examples: https://netplan.readthedocs.io/en/stable/examples/
- systemd.net-naming-scheme(7) man page: https://www.freedesktop.org/software/systemd/man/systemd.net-naming-scheme.html
- systemd-networkd documentation: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- iproute2 `ip-route(8)` and `ip-rule(8)` man pages
- Ubuntu Server networking documentation: https://ubuntu.com/server/docs/network-configuration
- `ping(8)` man page for `-I` interface bind flag

## Issues Found
- **Contradictory interface naming explanation.** The original bullet list claimed `p3s0` = "PCI slot 3, function 0" while the very next bullet correctly described `enp3s0` as "ethernet on PCI bus 3, slot 0". Per the systemd `net-naming-scheme(7)` spec, in `enp3s0` the `p<N>` component is the PCI bus number and `s<N>` is the hotplug slot (with `f<N>` reserved for the PCI function). Updated the middle bullet to read "PCI bus 3, slot 0" so the explanation is internally consistent and matches the systemd naming scheme.

## Review Notes
- The Netplan YAML samples (renderer, ethernets, dhcp4, addresses, routes with `to`/`via`/`metric`/`table`, `routing-policy` with `from`/`table`, `dhcp4-overrides` with `route-metric` and `use-dns`, and `match.macaddress` + `set-name`) are all valid against the current Netplan reference.
- The `via: 0.0.0.0` syntax used for on-link routes in the policy-routing example is an idiomatic way some operators write directly-connected routes; Netplan also supports the cleaner `scope: link` form for on-link routes. Both work in practice, so this was left as written.
- `netstat -i` is technically from the legacy `net-tools` package and may not be installed by default on minimal Ubuntu images; the post already shows `ip -s link` as an alternative, which is fine.
- `match.macaddress` with `set-name` only works for physical interfaces in Netplan; this is correctly used in the post (not applied to virtual/bridge interfaces).
- The advice about route metrics (lower metric = higher priority) and policy routing tables matches the kernel/iproute2 behavior.
- All shell commands (`ip link show`, `ip -br link show`, `ip -br addr show`, `ethtool`, `netplan generate`, `netplan try`, `ping -I <iface>`, `networkctl status`, `ip -s link show`, `iftop -i`) are syntactically correct.
