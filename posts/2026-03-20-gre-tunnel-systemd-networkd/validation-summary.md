# Validation Summary: How to Create a GRE Tunnel Using systemd-networkd

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- GRE tunnels
- systemd-networkd
- systemd `.netdev` and `.network` configuration
- `sysctl` / IPv4 forwarding
- kernel module loading with `modules-load.d`

## Sources Consulted
- systemd.netdev(5): https://man7.org/linux/man-pages/man5/systemd.netdev.5.html
- systemd.network(5): https://man7.org/linux/man-pages/man5/systemd.network.5.html
- systemd-networkd.service(8): https://man7.org/linux/man-pages/man8/systemd-networkd.8.html
- networkctl(1): https://man7.org/linux/man-pages/man1/networkctl.1.html
- modules-load.d(5): https://man7.org/linux/man-pages/man5/modules-load.d.5.html
- ip-link(8): https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html

## Issues Found
- The GRE `.netdev` examples omitted `Independent=yes`. In current `systemd.netdev`, tunnel netdevs default to `Independent=no`, which means a separate `.network` file must request the tunnel with `Tunnel=` for it to be created. Because this post uses standalone `.netdev` plus `.network` files for `gre0`, I added `Independent=yes` to both host examples so the tunnel is created as described.
- The post stated that `ip_gre` should be loaded at boot unconditionally. The `modules-load.d(5)` documentation says static module loading is usually unnecessary because modern kernels generally auto-load needed modules. I changed that guidance to make boot-time loading conditional on automatic module loading being unavailable on the target system.

## Review Notes
The guide assumes the host is already using `systemd-networkd` as its network manager. The route examples, `ip_forward` setting, and verification commands are otherwise technically consistent with the current documentation.
