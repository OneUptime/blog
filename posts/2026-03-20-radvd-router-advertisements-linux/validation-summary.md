# Validation Summary: How to Configure radvd for IPv6 Router Advertisements on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6 Neighbor Discovery
- Router Advertisements (RA)
- `radvd`
- Linux networking
- SLAAC
- `tcpdump`
- `rdisc6` / `ndisc6`
- `systemd`

## Sources Consulted
- `radvd.conf(5)` from the official `radvd` upstream repository: https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.conf.5.man
- `radvd(8)` from the official `radvd` upstream repository: https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.8.man
- Upstream `radvd` systemd unit template: https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.service.in
- Upstream `radvd` README / FAQ in the official repository: https://github.com/radvd-project/radvd
- RFC 4861, Neighbor Discovery for IP Version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- Red Hat documentation for configuring `radvd`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-configuring_the_radvd_daemon_for_ipv6_routers
- Fedora package page for `radvd`: https://packages.fedoraproject.org/pkgs/radvd/radvd/
- Debian package pages for `radvd` and `ndisc6`: https://packages.debian.org/radvd and https://packages.debian.org/ndisc6
- Arch Linux package page for `radvd`: https://archlinux.org/packages/extra/x86_64/radvd/
- NDisc6 upstream homepage: https://www.remlab.net/ndisc6/
- Debian man page for `rdisc6(8)`: https://manpages.debian.org/unstable/ndisc6/rdisc6.8.en.html

## Issues Found
- The sample config set `AdvRouterAddr on` and described it as including the router's own address in normal RAs. In upstream `radvd.conf(5)`, `AdvRouterAddr` is a Mobile IPv6-specific option, so I changed it to `off` and updated the comment to avoid misleading basic SLAAC setups.
- The comments for `AdvManagedFlag` and `AdvOtherConfigFlag` were oversimplified. I rewrote them to match the RFC/upstream meaning: they advertise DHCPv6-managed address configuration and other non-address DHCPv6 configuration, rather than implying a simple SLAAC-versus-DHCPv6 switch.
- The RA interval comment implied a fixed send interval. I corrected it to describe `MinRtrAdvInterval` and `MaxRtrAdvInterval` as interval bounds, which is how `radvd` and RFC 4861 define them.
- The `AdvDefaultLifetime` comment implied a general router validity timer. I corrected it to state that it controls how long the router remains a default router, which is the RFC-defined behavior.
- The `rdisc6` example reused the router interface name from earlier sections. I clarified that `rdisc6` should be run from a client interface on the advertised segment, updated the command to `eth0`, and fixed the sample output line to match.
- The direct reload example used `/var/run/radvd/radvd.pid`, which does not match the upstream default PID file path. I changed the generic systemd example to `systemctl reload radvd` and corrected the explicit PID-file example to `/var/run/radvd.pid`.
- The conclusion overstated what `radvd` alone provides. I corrected it to note that `radvd` advertises the prefix, but IPv6 forwarding and routing must still be configured separately, and I made the prefix lifetime explanation more precise.

## Review Notes
- The post correctly uses the documentation prefix `2001:db8::/32` for example IPv6 addresses.
- The walkthrough assumes a systemd-based Linux host for service management. That is consistent with the commands shown in the article.
