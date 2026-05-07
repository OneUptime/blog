# Validation Summary: How to Add a Static Route on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux routing
- `iproute2`
- Netplan
- NetworkManager (`nmcli`)
- `systemd-networkd`
- RHEL/CentOS ifcfg route files
- IPv4 static routes

## Sources Consulted
- `ip-route(8)` man page from `iproute2`: https://manpages.debian.org/bookworm/iproute2/ip-route.8.en.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan static IP example: https://netplan.readthedocs.io/en/1.1.1/using-static-ip-addresses/
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager settings reference for `ipv4.routes`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Red Hat Enterprise Linux 7, configuring static routes in ifcfg files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-configuring_static_routes_in_ifcfg_files
- Red Hat Enterprise Linux 8, configuring static routes with `nmcli`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- `systemd.network(5)` reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Debian Reference, Chapter 5 network setup: https://www.debian.org/doc/manuals/debian-reference/ch05

## Issues Found
- The `ip route replace` explanation overstated behavior. I changed it to match the man page wording: it changes an existing route or adds a new one.
- The Netplan subsection title implied Netplan was the generic approach for all Ubuntu/Debian systems. I narrowed it to Ubuntu and Debian systems that use Netplan.
- The NetworkManager example used `eth0` as though `nmcli connection` always targets an interface name. I changed it to `<connection_name>` because `nmcli connection modify` operates on a connection profile ID.
- The `systemd-networkd` example was incomplete as a `.network` file. I added the required `[Match]` and `[Network]` sections so the file structure is valid.
- The shell script always printed `Added` even when `ip route add` failed. I changed it to report success or failure accurately.

## Review Notes
- Commands such as `ip route add` require root privileges; the examples are valid when run as `root` or with `sudo`.
- The `/etc/rc.local` approach is legacy and distro-dependent, but the section is correctly labeled as legacy.
