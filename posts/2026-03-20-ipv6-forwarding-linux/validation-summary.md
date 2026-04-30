# Validation Summary: How to Enable IPv6 Forwarding on Linux - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux kernel `sysctl`
- Router Advertisement handling
- `systemd-networkd`
- `ping`
- `tcpdump`

## Sources Consulted
- Linux kernel IP Sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- `systemd.network(5)` documentation: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- `networkd.conf(5)` documentation: https://www.freedesktop.org/software/systemd/man/networkd.conf.html
- `sysctl(8)` manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Local `tcpdump --help` output for CLI syntax verification

## Issues Found
- The post said enabling `net.ipv6.conf.all.forwarding=1` automatically sets `accept_ra=0` on all interfaces. The kernel documentation describes this as a functional forwarding/host-router behavior change: Router Advertisements are not accepted by default when forwarding is enabled, unless `accept_ra=2` is set. I corrected the explanation to match the documented behavior.
- The persistent `accept_ra` example was commented out as `# net.ipv6.conf.eth0.accept_ra = 2`, which would not persist anything if copied into a sysctl file. I uncommented the line.
- The verification example used `ping6 -I eth0 2001:db8:other-network::1`. `2001:db8:other-network::1` is not a valid IPv6 literal, and current iputils documents `ping` with `-6` for IPv6. I changed the example to `ping -6 -I eth0 2001:db8:2::1`.
- The `tcpdump` verification note said a capture on `eth0` would show packets "arrive and be forwarded," which is misleading for inter-interface forwarding. I changed the example to capture on `any` so the command matches the explanation on Linux.
- The `systemd-networkd` section said to set `IPv6Forwarding=yes` only in a `.network` file. Current systemd documentation states that per-interface `IPv6Forwarding=` alone does not ensure IPv6 forwarding and that the global setting in `networkd.conf` must be enabled. I updated the example accordingly and kept `IPv6AcceptRA=no` as the per-interface router setting.

## Review Notes
- The sysctl commands and file-based sysctl examples are otherwise technically correct and current.
- The `systemd-networkd` forwarding knobs are version-sensitive. Current systemd documentation uses `IPv6Forwarding=` in `networkd.conf`; older releases documented `IPForward=ipv6` in `.network` files.
