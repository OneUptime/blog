# Validation Summary: How to Configure MACVLAN and IPVLAN Interfaces on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux networking
- Linux MACVLAN and IPVLAN interfaces
- iproute2 `ip` commands
- NetworkManager and `nmcli`
- Podman container networking

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Getting started with IPVLAN" and "Comparison of IPVLAN and MACVLAN": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Linux kernel IPVLAN Driver HOWTO: https://www.kernel.org/doc/html/v5.12/networking/ipvlan.html
- ip-link(8) Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- NetworkManager `nm-settings-nmcli` reference for `macvlan.*` and `ipvlan.*` properties: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Podman `podman-network-create(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Docker Macvlan network driver documentation, used for the kernel-level host/parent communication caveat: https://docs.docker.com/engine/network/drivers/macvlan/

## Issues Found
- The IPVLAN L3 comment said L3 mode acts as a router between the parent and virtual interface. The kernel documentation describes L3 mode as switching traffic into the parent namespace's L3/routing path, with no multicast or broadcast traffic for slaves, so the comment was changed to reflect that behavior.
- The Podman MACVLAN example said the container now has a unique MAC. MACVLAN normally gives endpoints separate MAC addresses, but the command itself does not explicitly show or guarantee a user-chosen MAC. The comment was changed to state that the container uses a MACVLAN interface with direct access to the parent network.

## Review Notes
- The `ip link add`, `ip addr add`, `ip link set`, and `ip -d link show type ...` examples use valid iproute2 command forms for MACVLAN and IPVLAN interfaces.
- The `nmcli connection add type macvlan` example uses documented NetworkManager properties: `macvlan.parent`, `macvlan.mode`, `ipv4.addresses`, `ipv4.method`, and `connection.autoconnect`.
- The Podman network creation command uses the documented `macvlan` driver, subnet/gateway options, and `-o parent=...` option. Podman documents that rootless mode cannot use MACVLAN/IPVLAN host interfaces, so these examples correctly use `sudo`.
