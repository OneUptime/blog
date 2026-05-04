# Validation Summary: How to Configure a VLAN with systemd-networkd

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- systemd-networkd
- Linux networking
- 802.1Q VLAN tagging
- `.netdev` and `.network` unit files
- `networkctl` and `ip` (iproute2) tooling
- DHCP client configuration

## Sources Consulted
- systemd.netdev(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.netdev.html
- systemd.network(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.network.html
- networkctl(1) man page — https://www.freedesktop.org/software/systemd/man/networkctl.html
- ip-link(8) and ip-address(8) from iproute2
- IEEE 802.1Q standard for VLAN tagging

## Issues Found
No technical issues found.

- The `.netdev` file syntax — `[NetDev]` with `Name=` and `Kind=vlan`, plus `[VLAN]` with `Id=` — matches the systemd.netdev(5) specification.
- The `VLAN=` directive in the parent interface's `[Network]` section is the correct mechanism to attach a VLAN child device to a physical interface, per systemd.network(5). It can be specified multiple times for trunked interfaces, as the post correctly demonstrates.
- The VLAN child `.network` file with `[Match] Name=eth0.10` and an `[Network] Address=` is correct.
- `DHCP=ipv4` is a valid value for the `DHCP=` directive (alongside `ipv6`, `yes`, `no`).
- All verification commands (`systemctl restart systemd-networkd`, `ip link show`, `ip addr show`, `networkctl status`) are accurate and current.
- The naming convention `eth0.10` for VLAN subinterfaces is the conventional Linux pattern (`<parent>.<vlan-id>`); systemd-networkd does not require this name, but it is widely used and works.
- File ordering via numeric prefixes (10-, 20-, 21-) is consistent with systemd-networkd's alphabetical file processing.

## Review Notes
- The post does not mention setting `LinkLocalAddressing=no` or otherwise suppressing addressing on the parent interface when it is used purely as a VLAN trunk. In a pure-trunk setup, operators may want to add `[Network] LinkLocalAddressing=no` to `10-eth0.network` to avoid an unwanted link-local address on the trunk. This is a stylistic/operational nuance, not a technical error.
- The post does not cover advanced `[VLAN]` options (e.g., `Protocol=` for 802.1ad/QinQ, `GVRP=`, `MVRP=`, `ReorderHeader=`, `LooseBinding=`). These are out of scope for an introductory guide.
- `Gateway=` in the VLAN `.network` file will install a default route via that VLAN; if multiple VLAN interfaces each set `Gateway=`, only one will win. Readers building a multi-VLAN trunk should be aware of this, though the post's single-VLAN example is fine.
- The DHCP example only sets `DHCP=ipv4`; in practice operators often pair this with `IPv6AcceptRA=` for dual-stack, but that is beyond the scope of this short guide.
