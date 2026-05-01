# Validation Summary: How to Configure DHCP on a VLAN Interface

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IEEE 802.1Q VLAN interfaces
- DHCP on Linux
- `dhclient`
- Netplan
- NetworkManager / `nmcli`
- Debian `ifupdown` and `/etc/network/interfaces`
- `systemd-networkd`

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Debian `dhclient(8)` man page: https://manpages.debian.org/bookworm/isc-dhcp-client/dhclient.8.en.html
- Debian `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Debian `vlan-interfaces(5)` man page: https://manpages.debian.org/bookworm/vlan/vlan-interfaces.5.en.html
- `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `systemd.network` reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `systemd.netdev` reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html

## Issues Found
- The `systemd-networkd` example was incomplete. The original post defined the VLAN netdev and the VLAN interface DHCP settings, but it did not attach the VLAN to the parent link. I added `/etc/systemd/network/20-eth0.network` with `VLAN=eth0.100`, which is required by `systemd-networkd` to create the VLAN on `eth0`.
- The `nmcli` example did not explicitly name the VLAN interface even though the rest of the guide consistently uses `eth0.100`. I added `ifname eth0.100` so the created VLAN device matches the guide and NetworkManager's documented VLAN syntax.
- The prerequisites were too strict for some methods. The post originally required a pre-created VLAN interface, but the Netplan, `nmcli`, `/etc/network/interfaces`, and `systemd-networkd` methods can create the VLAN as part of their configuration. I changed this to require the parent interface and VLAN ID instead.
- The DHCP reachability wording was too narrow. The post originally implied the DHCP server must be on the VLAN and that the switch “serves DHCP.” I corrected this to note that a DHCP server or relay must be reachable through the VLAN, and that the switch port must carry the tagged VLAN.

## Review Notes
- The Netplan example is valid as written for the `networkd` renderer. Its `dhcp4-overrides` keys are backend-specific and only apply with the supported backend behavior documented by Netplan.
- `cat /etc/resolv.conf` can be a coarse DNS check on systems using resolver daemons; `resolvectl status eth0.100` is the more interface-specific verification command when `systemd-resolved` is in use.
- The author GitHub URL resolves correctly.
