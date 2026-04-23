# Validation Summary: How to Remove an IPv4 Address from an Interface with ip addr del

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- iproute2 `ip addr`
- IPv4 addressing
- NetworkManager `nmcli`
- Netplan
- systemd-networkd `networkctl`

## Sources Consulted
- iproute2 `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- systemd `networkctl(1)` reference: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- Netplan `netplan apply` documentation: https://netplan.readthedocs.io/en/1.1.1/netplan-apply/
- Local CLI help: `ip addr help`, `nmcli connection modify --help`, `networkctl --help`

## Issues Found
- The post described `ip -4 addr flush dev eth0` as removing "all IPs" / "all addresses", but the `-4` selector limits the command to IPv4 addresses. I changed the description, section heading, and conclusion to say "all IPv4 addresses".
- The route-verification section implied the connected `192.168.1.0/24` route would always be removed after deleting the address. The `ip-address(8)` documentation notes that automatic prefix-route removal depends on how the address was configured, and it does not search for a route to delete when `noprefixroute` is used. The route can also remain if another address on the interface still uses the same prefix. I changed this note to make it conditional.
- The post did not mention that these commands require administrative privileges. I added a short note to run them as root or with `sudo`.

## Review Notes
- `nmcli connection modify "myconn" -ipv4.addresses "192.168.1.101/24"` is valid syntax for removing a specific entry from the multivalue `ipv4.addresses` property.
- `networkctl reload` is appropriate after editing `.network` files; current systemd documentation states that modified or removed `.network` files cause matching interfaces to be reconfigured.
