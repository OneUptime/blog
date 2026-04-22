# Validation Summary: How to Set the MTU on a VLAN Interface

## Status
validated

## Post Type
Tutorial / Linux networking guide

## Technologies Covered
- Linux VLAN interfaces
- 802.1Q VLAN tagging
- MTU and jumbo frames
- iproute2 `ip link`
- systemd-networkd
- Debian `/etc/network/interfaces`
- iputils `ping`

## Sources Consulted
- iproute2 `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- systemd `systemd.network(5)` manual: https://man7.org/linux/man-pages/man5/systemd.network.5.html
- systemd `systemd.netdev(5)` manual: https://man7.org/linux/man-pages/man5/systemd.netdev.5.html
- Debian `interfaces(5)` manual: https://manpages.debian.org/testing/ifupdown/interfaces.5.en.html
- Debian `vlan-interfaces(5)` manual: https://manpages.debian.org/testing/vlan/vlan-interfaces.5.en.html
- iputils `ping(8)` manual: https://manpages.debian.org/testing/iputils-ping/ping.8.en.html
- Linux kernel networking MTU documentation: https://docs.kernel.org/networking/netdevices.html

## Issues Found
- The VLAN creation example set `eth0.100` to MTU 9000 without first raising `eth0`. Since the post correctly states that the VLAN MTU must not exceed the lower interface MTU, I added `ip link set eth0 mtu 9000` before creating/configuring the VLAN in that example.
- The systemd-networkd example defined `20-eth0.100.netdev` but did not attach it to the parent interface. systemd-networkd requires `VLAN=eth0.100` in the parent `.network` file to create the VLAN on that link, so I added it.
- The parent systemd-networkd snippet said there was no IP on the parent interface, but systemd-networkd enables IPv6 link-local addressing by default on ordinary interfaces. I added `LinkLocalAddressing=no` to make the example match that intent.

## Review Notes
The remaining commands and configuration snippets match current Linux/iproute2, systemd-networkd, Debian ifupdown, and iputils syntax. The `ping -M do -s 8972` example is correct for an IPv4 9000-byte MTU test because it accounts for the 20-byte IPv4 header and 8-byte ICMP header.
