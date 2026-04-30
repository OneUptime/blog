# Validation Summary: How to Make GRE Tunnel Configuration Persistent Across Reboots

## Status
validated

## Post Type
Guide

## Technologies Covered
- GRE tunnels
- Linux `iproute2`
- `systemd-networkd`
- `networkctl`
- NetworkManager `nmcli`
- Debian `ifupdown` and `/etc/network/interfaces`
- systemd services

## Sources Consulted
- systemd `systemd.netdev` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd `systemd.network` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd `networkctl` manual: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- systemd `systemd.syntax` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html
- systemd `systemd.service` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- NetworkManager `nmcli` manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Debian `interfaces(5)` manual: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- Local CLI help checked for `ip tunnel` and `nmcli connection add`

## Issues Found
- The `systemd-networkd` `.netdev` example used trailing inline `#` comments on `Local=` and `Remote=` lines. systemd documents comments as full lines beginning with `#` or `;`, so I moved those comments onto their own lines to avoid invalid values in the example.
- The NetworkManager example configured the tunnel IP but omitted the example static route to `192.168.2.0/24`, even though the rest of the post and verification steps assumed that route existed. I added `ipv4.routes "192.168.2.0/24 172.16.1.2"` to make the example complete and consistent.
- The systemd service used `ExecStop=/sbin/ip link del gre1`, which is less portable on current systems where `ip` may not live under `/sbin`. systemd allows a simple executable name from its standard search path, so I changed it to `ExecStop=ip link del gre1`.
- The verification step said `ping 172.16.1.2` "Should succeed" without qualification. I updated it to note that success depends on the remote GRE peer being up and allowing ICMP, which is not guaranteed by local persistence alone.

## Review Notes
- `networkctl reload` is sufficient for creating a new GRE netdev from a new `.netdev` file. Behavior for updating existing netdev settings depends on systemd version, but that does not affect the post’s basic persistence workflow.
- The `NetworkManager` example leaves IPv6 at its default behavior. That is technically valid for an IPv4 GRE example, though some environments may choose to set `ipv6.method disabled` explicitly.
