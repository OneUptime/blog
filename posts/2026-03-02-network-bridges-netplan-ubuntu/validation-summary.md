# Validation Summary: How to Configure Network Bridges with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (YAML network configuration)
- systemd-networkd (renderer)
- Linux kernel bridges (iproute2 `bridge` / `ip` tools)
- Spanning Tree Protocol (STP)
- Linux bonding (active-backup mode)
- KVM / libvirt (virsh, network XML)
- LXC containers
- cloud-init network configuration

## Sources Consulted
- Netplan reference documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- iproute2 `bridge(8)` man page and `bridge --help` output (verified locally)
- systemd-networkd / `networkctl(1)` documentation
- libvirt network XML format: https://libvirt.org/formatnetwork.html
- LXC container configuration: https://linuxcontainers.org/lxc/manpages/man5/lxc.container.conf.5.html
- IEEE 802.1D (STP) parameter ranges
- Ubuntu Server installer (Subiquity) cloud-init handling: /etc/cloud/cloud.cfg.d/subiquity-disable-cloudinit-networking.cfg

## Issues Found

1. **Invalid `bridge stp show` command.** The `bridge` tool from iproute2 does not have an `stp` subcommand — verified via `bridge --help` (subcommands are `link | fdb | mdb | vlan | monitor`) and by running it locally (`Object "stp" is unknown`). Replaced with `ip -d link show br0` (which prints the STP state and bridge parameters) and noted `brctl showstp br0` as an alternative when the legacy `bridge-utils` package is installed.

2. **Incorrect `path-cost` syntax in Netplan.** Netplan defines `path-cost` as a *mapping* of port name → integer (per-port STP cost), not a single integer at the bridge level. The example `path-cost: 100` would fail Netplan parsing. Updated the example to the correct mapping form:
   ```yaml
   path-cost:
     enp3s0: 100
   ```

## Review Notes

- The bond example uses `mode: active-backup` with `mii-monitor-interval: 100`, which is correct Netplan syntax (maps to the kernel bonding driver's `miimon` parameter).
- The post's claim that `forward-delay: 4` "requires rapid-STP capable switches" is slightly imprecise — the Linux kernel bridge implements classic STP (IEEE 802.1D), not RSTP, and 4 seconds is simply the minimum IEEE 802.1D forward-delay value. However, this does not affect the correctness of the configuration shown, so no change was made.
- `max-age: 12` is shown as an example value, not as a default; the IEEE 802.1D / Linux kernel default is 20 seconds. The post does not claim these are defaults, so this is acceptable.
- Using `dhcp4: false` on a bridge member ethernet, with the IP on the bridge itself, is the correct pattern and matches Netplan's documented bridge example.
- The libvirt network XML and `virsh net-define`/`net-start`/`net-autostart` workflow is accurate and current.
- The LXC `lxc.net.0.*` keys (`type`, `link`, `flags`, `hwaddr`) are the correct LXC 3.x+ configuration keys.
