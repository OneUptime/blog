# Validation Summary: How to Configure IGMP Proxy on a Linux Router

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- igmpproxy (Pali Rohár's fork, as packaged in Debian/Ubuntu/Fedora)
- Linux multicast routing (IGMP, MFC via `/proc/net/ip_mr_cache`)
- Linux kernel sysctls (`net.ipv4.ip_forward`, `mc_forwarding`)
- systemd (service management for igmpproxy)
- iptables (FORWARD/INPUT/OUTPUT rules for IGMP and 224.0.0.0/4)
- APT / DNF package managers

## Sources Consulted
- [igmpproxy.conf(5) — Debian Manpages](https://manpages.debian.org/testing/igmpproxy/igmpproxy.conf.5.en.html)
- [igmpproxy(8) — Debian Manpages](https://manpages.debian.org/testing/igmpproxy/igmpproxy.8.en.html)
- [pali/igmpproxy on GitHub](https://github.com/pali/igmpproxy)
- [Debian package: igmpproxy](https://packages.debian.org/sid/igmpproxy)
- [Linux kernel ip-sysctl documentation](https://docs.kernel.org/networking/ip-sysctl.html)

## Issues Found

1. **`mc_forwarding` should not be set manually.**
   The original post instructed the reader to `echo 1 | sudo tee /proc/sys/net/ipv4/conf/all/mc_forwarding` and to persist `net.ipv4.conf.all.mc_forwarding = 1` via sysctl. This flag is set automatically by the kernel when a multicast routing daemon opens an `IPPROTO_IGMP` socket and calls `setsockopt(MRT_INIT)`. Writing to it manually typically returns `EPERM`. Fixed by removing the `mc_forwarding` write/sysctl lines and adding a clarifying note that igmpproxy enables it automatically. Renamed the section from "Enabling IP Forwarding and Multicast Routing" to "Enabling IP Forwarding" to reflect the change.

2. **`altnet` was misused for restricting forwarded multicast groups.**
   The "Restricting Forwarded Groups" section used `altnet 239.0.0.0/8` on the upstream interface, claiming this limits proxied groups. Per the `igmpproxy.conf(5)` manpage, `altnet` defines additional valid *source* networks for the interface, not destination multicast groups. The correct option is `whitelist`, which restricts which IGMP membership reports are forwarded upstream. Fixed by switching the example to use `whitelist 239.0.0.0/8` (kept alongside `altnet 0.0.0.0/0`) and added a note distinguishing the two options.

## Review Notes
- The Debian/Ubuntu igmpproxy package historically shipped only a SysV init script (`/etc/init.d/igmpproxy`). systemd's sysv-generator synthesizes a unit at runtime, so `systemctl enable --now igmpproxy` works correctly — the post's commands are valid even though no native `.service` file is installed.
- The iptables rules are correct but readers using nftables or firewalld will need equivalent rules in those frameworks.
- The example uses `eth0`/`eth1`; on systemd-based modern distros, predictable interface names like `enp1s0`/`enp2s0` are more common. Readers should substitute their actual interface names.
- The `quickleave` keyword (omitted from the post) is commonly added to `igmpproxy.conf` to reduce leave latency for IPTV-style workloads — a possible future improvement.
