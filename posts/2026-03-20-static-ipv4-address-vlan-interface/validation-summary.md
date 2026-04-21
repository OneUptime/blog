# Validation Summary: How to Assign a Static IPv4 Address to a VLAN Interface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking
- VLAN interfaces
- IPv4 static addressing
- iproute2 (`ip addr`, `ip link`, `ip route`)
- Netplan
- NetworkManager / `nmcli`
- Debian ifupdown `/etc/network/interfaces`

## Sources Consulted
- ip-address(8), Linux manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- ip-route(8), Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan VLAN configuration example: https://netplan.readthedocs.io/en/1.1.2/single-nic-vm-host-with-vlans/
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nm-settings-nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Debian ifupdown interfaces(5) man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Debian vlan-interfaces(5) man page: https://manpages.debian.org/testing/vlan/vlan-interfaces.5.en.html

## Issues Found
- The Debian `/etc/network/interfaces` example used a separate `netmask 255.255.255.0` line. Debian ifupdown documentation marks the `netmask` option as deprecated for the static IPv4 method, so the snippet was changed to `address 192.168.100.10/24`.

## Review Notes
- The `ip addr`, `ip link`, and `ip route` commands match the current iproute2 command syntax.
- The Netplan VLAN, static address, default route, and nameserver fields match current Netplan documentation.
- The `nmcli connection add type vlan ... dev eth0 id 100 ... ipv4.method manual` example matches NetworkManager's documented VLAN and IPv4 settings.
- The `dns-nameservers` option in `/etc/network/interfaces` depends on resolver integration such as `resolvconf` or `openresolv`; this is valid in the ifupdown ecosystem but should be confirmed on target Debian systems.
- Adding a default route may fail or conflict if another default route already exists in the same routing table; production examples may need route metrics or policy routing.
