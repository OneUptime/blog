# Validation Summary: How to Assign a Static IPv4 Address to a Bridge Interface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux bridge interfaces
- iproute2 `ip link`, `ip addr`, and `ip route`
- Netplan
- NetworkManager `nmcli`
- systemd-networkd
- Debian `/etc/network/interfaces` bridge configuration
- IPv4 static addressing and default routes

## Sources Consulted
- Linux iproute2 `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux iproute2 `ip-address(8)` manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux iproute2 `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel Ethernet bridge documentation: https://docs.kernel.org/networking/bridge.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Ubuntu Server networking documentation: https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- Red Hat Enterprise Linux 10 network bridge documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_networking/configuring-a-network-bridge
- NetworkManager `nm-settings-nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- systemd.network manual: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- systemd.netdev manual: https://www.freedesktop.org/software/systemd/man/257/systemd.netdev.html
- Debian `bridge-utils-interfaces(5)` manual: https://manpages.debian.org/buster/bridge-utils/bridge-utils-interfaces.5.en.html
- Local CLI help output for `iproute2-6.1.0` and `nmcli 1.46.0`

## Issues Found
- The `nmcli` example created the bridge profile and assigned IPv4 settings, but did not add `eth0` as a NetworkManager bridge port. Without a port profile, the bridge would not be connected to the physical network as described by the guide. Updated the snippet to set `connection.autoconnect-ports 1`, add `eth0` as an Ethernet port using `port-type bridge` and `controller br0`, and activate `br0`.

## Review Notes
- The `ip addr flush dev eth0` command is valid for removing addresses from the physical port before attaching it to the bridge. The iproute2 manual notes that, without a scope filter, it removes all protocol addresses from the device, including IPv6 link-local addresses.
- The Netplan route form `routes: - to: default` is current for supported Ubuntu releases, but older Ubuntu 18.04 Netplan configurations required `gateway4` instead.
- The updated `nmcli` terminology (`controller`, `port-type`, and `connection.autoconnect-ports`) matches current RHEL and NetworkManager documentation. Older RHEL releases used the older aliases `master`, `slave-type`, and `connection.autoconnect-slaves`.
- The Debian `/etc/network/interfaces` bridge options are valid for ifupdown bridge extensions, but modern Debian installations may use NetworkManager or systemd-networkd instead.
