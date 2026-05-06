# Validation Summary: How to Configure a Default Gateway on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux IPv4 routing
- `iproute2` / `ip route`
- Netplan
- NetworkManager / `nmcli`
- `systemd-networkd`
- Debian `ifupdown` and `/etc/network/interfaces`

## Sources Consulted
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager settings reference (`nm-settings-nmcli`): https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- `systemd.network` reference: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- Debian `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- RHEL 8 networking considerations (legacy network scripts): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/networking_considerations-in-adopting-rhel-8
- RHEL 9.4 release notes, deprecated functionality (`ifcfg` deprecation): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/9.4_release_notes/deprecated-functionality
- Local CLI help output: `ip route help`, `nmcli --help`

## Issues Found
- The `nmcli` example set `ipv4.method manual` without setting `ipv4.addresses`. NetworkManager's documentation requires at least one static IPv4 address for `manual`, so I added `nmcli connection modify eth0 ipv4.addresses 192.168.1.10/24`.
- The `ifcfg` alternative was presented as a normal current option. I clarified that it applies to systems still using legacy `ifcfg` profiles because Red Hat documents legacy network scripts as deprecated and `ifcfg` profiles as deprecated in RHEL 9.
- The Debian `/etc/network/interfaces` example used `netmask`, which Debian documents as deprecated for the static method. I replaced it with CIDR notation in the `address` field: `192.168.1.10/24`.
- The multi-gateway section implied plain static routes automatically fail over when a gateway becomes unreachable. I changed that sentence to the technically accurate metric-based behavior: the lower-metric route is preferred while both routes remain present.
- The key takeaway said the gateway must be on the same subnet as the host IP. That is too absolute because Linux supports explicitly treating a gateway as on-link. I corrected the statement to say that, by default, the gateway must be reachable on a directly connected network.

## Review Notes
- The post is accurate for IPv4. It does not cover IPv6 default routes such as `::/0`, which is acceptable given the post tags and examples.
- The Netplan example already uses the current recommended `routes: - to: default` form rather than older `gateway4` syntax.
- `traceroute` is a valid verification command, but some minimal Linux installs may require the package to be installed separately.
