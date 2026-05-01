# Validation Summary: How to Configure Dual-Stack on Linux Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux dual-stack networking
- IPv4 and IPv6 addressing and routing
- `systemd-networkd`
- NetworkManager and `nmcli`
- Netplan
- `ifupdown`
- `systemd-resolved`
- Linux kernel IPv6 sysctls
- `ip`, `ss`, and `ping`

## Sources Consulted
- `systemd.network(5)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Netplan static IP guide: https://canonical-netplan.readthedocs-hosted.com/en/latest/using-static-ip-addresses/
- Netplan YAML reference: https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/
- Debian `interfaces(5)` man page for `ifupdown`: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- `resolved.conf(5)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- `resolvectl(1)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- `ping(8)` Linux man page: https://man7.org/linux/man-pages/man8/ping.8.html
- `ss(8)` Linux man page: https://man7.org/linux/man-pages/man8/ss.8.html
- NGINX `listen` directive reference: https://nginx.org/r/listen

## Issues Found
- The `systemd-networkd` SLAAC example accepted Router Advertisements without preventing RA-learned gateway and DNS settings from overriding the static configuration. I updated the `[IPv6AcceptRA]` block to use `UseGateway=no` and `UseDNS=no`, and kept `DHCPv6Client=no` with a `systemd 246+` note because that option was added in newer systemd releases.
- The Netplan static example did not disable Router Advertisements, so systems using the `networkd` renderer could still learn extra IPv6 addresses or a default route from RA. I added `accept-ra: false` to make the static example behave predictably.
- The legacy `ifupdown` example used deprecated standalone `netmask` lines for both IPv4 and IPv6 static addresses. I converted both stanzas to current CIDR notation in the `address` field.
- The socket verification command used a regex that did not match the sample `ss` IPv6 output and could produce false positives by matching the peer-address column. I replaced it with separate `ss -tlnp4` and `ss -tlnp6` commands.
- The troubleshooting section used `ping6`, but current `iputils` documents IPv6 probing via `ping -6` after the historical `ping6` merge. I updated the commands to `ping -6`.
- The DNS verification example hard-coded `example.com` A and AAAA answers, which are not guaranteed to remain stable. I replaced the hard-coded addresses with a generic confirmation note.
- The `accept_ra` sysctl comment did not mention that forwarded hosts need `2` rather than `1` to keep accepting Router Advertisements. I corrected the comment accordingly.

## Review Notes
- `DNSSEC=yes` in the `systemd-resolved` example is technically valid when the chosen upstream resolvers support DNSSEC correctly. For broader compatibility, the systemd documentation recommends `DNSSEC=allow-downgrade` when resolver capabilities are not known in advance.
- The `DHCPv6Client=` setting in `[IPv6AcceptRA]` is version-specific. The post now notes that it requires `systemd` 246 or newer.
