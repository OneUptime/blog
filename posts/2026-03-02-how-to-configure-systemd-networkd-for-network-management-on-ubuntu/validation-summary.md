# Validation Summary: How to Configure systemd-networkd for Network Management on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu networking
- systemd-networkd
- systemd-resolved
- systemd `.network` and `.netdev` files
- networkctl
- Netplan
- NetworkManager
- Linux bridges, VLANs, bonds, static routes, and DHCP

## Sources Consulted
- systemd.network official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd.netdev official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd-networkd official documentation: https://www.freedesktop.org/software/systemd/man/systemd-networkd.service.html
- networkctl official documentation: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- Local installed man pages for `systemd.network(5)`, `systemd.netdev(5)`, `networkctl(1)`, and `resolvectl(1)`
- Ubuntu Server Netplan documentation: https://ubuntu.com/server/docs/explanation/networking/about-netplan/
- Ubuntu Server networking documentation: https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- Netplan NetworkManager default configuration documentation: https://netplan.readthedocs.io/en/1.1/nm-all/

## Issues Found
- The introduction said Ubuntu systems come with NetworkManager enabled by default. This is accurate for Ubuntu Desktop but too broad for Ubuntu Server/Core, where Netplan commonly delegates to `systemd-networkd`. Updated the wording to distinguish Desktop from Server.
- The configuration file location list omitted `/usr/local/lib/systemd/network/`, which is part of the documented systemd network configuration search path. Added it as local system defaults.
- The matching example used repeated `Name=` and `Type=` keys with inline comments. Updated the example to use whitespace-separated match lists and full-line comments, matching systemd syntax.
- The monitoring section listed `networkctl monitor`, which is not a current `networkctl` command. Replaced it with `watch -n 2 networkctl status eth0`.
- The monitoring section described `networkctl lldp` as link statistics. Corrected it to LLDP neighbor information and added `networkctl status -s eth0` for link statistics.
- The troubleshooting section used `systemd-analyze verify /etc/systemd/network/*.network`, but `systemd-analyze verify` checks unit files, not `.network` files. Replaced it with `networkctl reload` plus checking `systemd-networkd` logs for parser errors.
- The Netplan example used deprecated `gateway4`. Replaced it with the current default-route syntax using `routes:`, `to: default`, and `via:`.

## Review Notes
The post is technically relevant and the remaining examples align with documented systemd-networkd, systemd-resolved, networkctl, and Netplan behavior. On Ubuntu 18.04 specifically, Netplan's older `gateway4` syntax may still be needed because `to: default` was not supported there, but the updated route form is the current recommended syntax for modern Ubuntu releases.
