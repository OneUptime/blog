# Validation Summary: How to Configure IPv6 Routing on a Linux Router

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 routing on Linux
- Linux kernel IPv6 sysctl settings
- `systemd-networkd`
- `radvd`
- `iproute2`
- `iputils` (`ping`)
- `ip6tables` / Netfilter connection tracking

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `systemd.network` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `radvd` upstream man page source: https://github.com/radvd-project/radvd/blob/master/radvd.8.man
- `radvd.conf` upstream man page source: https://github.com/radvd-project/radvd/blob/master/radvd.conf.5.man
- `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8.html
- `iptables-extensions(8)` manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106

## Issues Found
- The `systemd-networkd` example used `IPv6Forwarding=yes`. That directive is version-sensitive and not required here because Step 1 already enables IPv6 forwarding globally via sysctl. I removed it to avoid a potentially unsupported configuration key on older `systemd-networkd` releases while preserving the intended behavior.
- The static route example used `fe80::neighbor` as the next hop, which is not a valid IPv6 address literal. I replaced it with `fe80::1` and clarified that it should be substituted with the actual upstream router's link-local address.
- The verification examples used `ping6`. Current `iputils` documents `ping -6` as the primary interface and notes that `ping6` has been merged into `ping`. I updated both commands to `ping -6`.
- The firewall example used the legacy `state` match. The current `iptables-extensions(8)` documentation describes `state` as a subset of `conntrack`, so I updated the rule to `-m conntrack --ctstate ESTABLISHED,RELATED`.

## Review Notes
The post is technically sound after the above fixes. One version-specific caveat remains: the latest `systemd-networkd` documentation includes `IPv6Forwarding=`, but many deployed distributions still ship older `systemd` releases, so relying on the sysctl-based forwarding configuration in Step 1 is the safer cross-version guidance in this post. The `ip6tables` examples are valid, though many modern distributions now prefer `nftables` as the primary firewall interface.
