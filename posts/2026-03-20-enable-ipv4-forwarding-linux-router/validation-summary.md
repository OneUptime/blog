# Validation Summary: How to Enable IPv4 Packet Forwarding on a Linux Router

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux kernel IPv4 forwarding
- Linux routing with `iproute2`
- `sysctl` kernel parameter configuration
- `iptables` and Netfilter forwarding rules
- IPv4 NAT with `MASQUERADE`

## Sources Consulted
- Linux kernel networking sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-address(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `sysctl(8)` Linux manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- `sysctl.conf(5)` Linux manual page: https://man7.org/linux/man-pages/man5/sysctl.conf.5.html
- `sysctl.d(5)` Linux manual page: https://man7.org/linux/man-pages/man5/sysctl.d.5.html
- `iptables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The permanent sysctl example appended to `/etc/sysctl.conf` and reloaded it with `sysctl -p`. That is not reliable on modern systemd-based systems because `systemd-sysctl` uses `sysctl.d` files rather than `/etc/sysctl.conf` at boot. I changed the example to write `/etc/sysctl.d/99-ip-forwarding.conf` and apply it with `sysctl --system`.
- The "stateful forwarding" example only allowed new connections from Network A to Network B, while allowing only return traffic in the opposite direction. That did not match the surrounding explanation of forwarding between both networks. I changed the example to use symmetric conntrack-based rules in both directions.
- The NAT section used `MASQUERADE` while the comment said the WAN interface could have either a static public IP or DHCP. Netfilter documents `MASQUERADE` for dynamically assigned IPs, with `SNAT` preferred for static addresses. I corrected the example so the WAN comment explicitly describes a dynamic public IP.
- The firewall examples used the older `-m state --state ...` syntax. I updated them to the current `-m conntrack --ctstate ...` form from the iptables extensions documentation.

## Review Notes
- The post is now technically correct for a basic Linux router using `iproute2`, `sysctl`, and `iptables`.
- The `iptables` examples remain valid, but some modern distributions prefer managing equivalent policy through `nftables` or a higher-level firewall manager such as `firewalld`.
- The sample router script is acceptable as a one-shot example, but it is not idempotent: rerunning it can duplicate firewall rules and cause `ip addr add` to fail if the addresses already exist.
