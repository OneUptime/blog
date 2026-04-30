# Validation Summary: How to Configure IPv6 MTU on Linux Interfaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux networking
- `iproute2` / `ip`
- NetworkManager / `nmcli`
- `systemd-networkd`
- `/etc/network/interfaces`
- GRE and SIT tunnels
- OpenVPN
- WireGuard

## Sources Consulted
- RFC 8200, *Internet Protocol, Version 6 (IPv6) Specification*: https://www.rfc-editor.org/rfc/rfc8200
- RFC 4213, *Basic Transition Mechanisms for IPv6 Hosts and Routers*: https://www.rfc-editor.org/rfc/rfc4213.html
- RFC 2784, *Generic Routing Encapsulation (GRE)*: https://www.rfc-editor.org/rfc/rfc2784.html
- RFC 2890, *Key and Sequence Number Extensions to GRE*: https://www.rfc-editor.org/rfc/rfc2890
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-link(8)` Debian man page: https://manpages.debian.org/testing/iproute2/ip-link.8.en.html
- `interfaces(5)` Debian man page: https://manpages.debian.org/stretch/ifupdown/interfaces.5.en.html
- `systemd.network(5)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- NetworkManager `nm-settings-nmcli(5)` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- WireGuard protocol documentation: https://www.wireguard.com/protocol/

## Issues Found
- The `/etc/network/interfaces` example used `tee -a` to append a new `iface eth0 inet6 static` stanza. That is not a safe generic persistence example because it can create a duplicate stanza or force a static IPv6 configuration on an interface that actually uses DHCP or router advertisements. I changed it to show adding `mtu 1480` to an existing stanza instead.
- The GRE, OpenVPN, IPsec, and WireGuard examples treated tunnel overhead as exact and unconditional. I updated the comments and the Python reference example to state the assumptions explicitly and note where overhead varies by enabled options or the outer IP family.
- The warning text and conclusion used stronger wording than the standards and implementation docs support (`IPv6 broken`, `exact overhead`, and an unconditional `1500 bytes is correct`). I changed those statements to technically precise wording.

## Review Notes
- `systemd-networkd` accepts `MTUBytes=` in the `[Link]` section of a `.network` file, and its documentation notes that if IPv6 is enabled, values below 1280 are raised automatically.
- NetworkManager exposes both link-layer MTU (`802-3-ethernet.mtu`) and IPv6-specific MTU (`ipv6.mtu`). The post's `nmcli` example uses the link-layer MTU, which is appropriate for general interface MTU changes.
- Local command checks were also used to confirm syntax and behavior in this environment (`iproute2 6.1.0`, `nmcli 1.46.0`, `ip -6 link show`).
