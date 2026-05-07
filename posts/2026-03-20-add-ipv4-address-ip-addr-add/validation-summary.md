# Validation Summary: How to Add an IPv4 Address to an Interface with ip addr add

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `iproute2` / `ip addr` / `ip link` / `ip route`
- IPv4 addressing
- NetworkManager / `nmcli`
- Netplan
- `systemd-networkd`

## Sources Consulted
- `ip-address(8)` man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip(8)` man page: https://man7.org/linux/man-pages/man8/ip.8.html
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager settings reference (`ipv4.addresses`, `ipv4.method`): https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- `systemd.network(5)` reference: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- Local command help/output verification: `ip -help`, `ip address help`, `ip -4 -brief addr show lo`
- Verified author link: https://github.com/nawazdhandala

## Issues Found
- The label example described `label` as creating a virtual interface alias. In `ip-address(8)`, labels tag an address, and the manual explicitly notes that aliases are not the right model for multiple addresses on one interface. I changed the comment to describe `eth0:1` as a label format instead.
- The persistent `nmcli` example only appended `ipv4.addresses`. Current NetworkManager documentation requires `ipv4.method manual` for static IPv4 addressing, so I updated the example to set `ipv4.method manual` alongside `ipv4.addresses`.

## Review Notes
- The `ip route` example is correct for the default behavior of `ip addr add`; if `noprefixroute` is used, the automatic prefix route is suppressed.
- The Netplan and `systemd-networkd` lines in the persistence section are abbreviated pointers to the relevant settings, not complete standalone configuration files.
- `eth0` is fine as an illustrative interface name, though many modern Linux systems use predictable interface names such as `ens3` or `enp0s31f6`.
