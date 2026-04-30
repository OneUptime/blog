# Validation Summary: How to Configure IPv6 Default Gateway on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux networking
- `ip` / `iproute2`
- `systemd-networkd`
- NetworkManager / `nmcli`
- Debian `ifupdown` (`/etc/network/interfaces`)
- RHEL/CentOS `ifcfg` network configuration
- Router Advertisements (RA)

## Sources Consulted
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- `traceroute(8)` Linux manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- `systemd.network(5)` official systemd documentation: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- `systemd.syntax(7)` official systemd syntax documentation: https://www.freedesktop.org/software/systemd/man/251/systemd.syntax.html
- NetworkManager reference manual (`nm-settings-nmcli`): https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Debian `interfaces(5)` man page: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- Red Hat IPv6 ifcfg guidance: https://access.redhat.com/solutions/347693
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.ietf.org/ietf-ftp/rfc/rfc4861.txt.pdf
- Fedora documentation on legacy `ifcfg` handling: https://docs.fedoraproject.org/fi/fedora/f36/release-notes/sysadmin/Networking/
- Fedora change proposal removing `ifcfg` support in NetworkManager: https://fedoraproject.org/wiki/Changes/RemoveIfcfgSupportInNM

## Issues Found
- The overview incorrectly described `::/0` as the default gateway. I corrected it to distinguish the default route (`::/0`) from the gateway (the next-hop router used by that route).
- The `systemd-networkd` example used an inline `#` comment on the `Gateway=` line. systemd configuration files do not support end-of-line comments, so I removed the inline comment to keep the snippet valid.
- The NetworkManager example set only `ipv6.gateway`. NetworkManager documents that this is only meaningful when addresses are also configured on the device, so I added `ipv6.addresses` and `ipv6.method manual` to make the example work as a static configuration example.
- The verification section used `ping6`. Current `iputils` documentation states that `ping6` was merged into `ping`, so I updated the examples to use `ping -6`. I also changed `traceroute6` to `traceroute -6` for consistency with current CLI usage.
- The Fedora `ifcfg` recommendation was outdated. Fedora moved away from `ifcfg` years ago and removed NetworkManager `ifcfg` support in Fedora 41, so I narrowed that section to RHEL/CentOS where the example remains relevant.
- The troubleshooting text implied that `radvd` is the generic RA daemon to check. I corrected it to say this only applies if the router actually uses `radvd`.

## Review Notes
- The `ip -6 route add default via fe80::1 dev eth0` examples are correct for link-local next hops; explicitly specifying the interface is still the safest and most portable form.
- `traceroute -6` requires the `traceroute` package to be installed; some minimal systems may only have `tracepath`.
- The Debian `/etc/network/interfaces` example is still valid for `ifupdown`, but many newer Debian and Ubuntu systems use other network stack managers by default.
