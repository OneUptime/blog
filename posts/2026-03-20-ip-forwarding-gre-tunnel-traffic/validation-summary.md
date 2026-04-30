# Validation Summary: How to Enable IP Forwarding for GRE Tunnel Traffic

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Linux IPv4 routing and packet forwarding
- GRE tunnels
- `sysctl` and `/proc/sys`
- `iproute2` (`ip tunnel`, `ip route`)
- `iptables`
- `nftables`
- Reverse path filtering (`rp_filter`)

## Sources Consulted
- Linux kernel `ip-sysctl` documentation: https://docs.kernel.org/networking/ip-sysctl.html
- `sysctl(8)` manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- `ip-tunnel(8)` manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `iptables(8)` manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- nftables man page: https://netfilter.org/projects/nftables/manpage.html
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- RFC 3704, Ingress Filtering for Multihomed Networks: https://www.rfc-editor.org/rfc/rfc3704

## Issues Found
1. **`rp_filter` guidance was incomplete.**
   - Before: The post checked and disabled only `net.ipv4.conf.gre0.rp_filter`.
   - After: The post now checks `net.ipv4.conf.all.rp_filter` as well, and explains that Linux uses the higher of `conf/all/rp_filter` and `conf/<iface>/rp_filter`.
   - Why: Per the kernel `ip-sysctl` documentation, disabling `rp_filter` only on `gre0` may still leave reverse path filtering effectively enabled if `conf/all/rp_filter` is non-zero.

2. **The nftables example was too brittle for a dynamically created GRE interface.**
   - Before: The post used `iif gre0` and `oif gre0` with no note about the required nftables table/base-chain context.
   - After: The post now uses `iifname "gre0"` and `oifname "gre0"` and notes that the `inet filter` table and `forward` base chain must already exist.
   - Why: The nftables documentation recommends `iifname`/`oifname` for interfaces that can appear and disappear dynamically. Also, unlike `iptables`, nftables does not provide a built-in `forward` chain unless one has been created in the ruleset.

3. **The per-interface forwarding sentence overstated exclusivity.**
   - Before: `You can enable forwarding on specific interfaces only:`
   - After: `You can also control forwarding on specific interfaces:`
   - Why: The kernel documentation describes per-interface `forwarding` as an interface-specific control; the revised wording avoids implying it is the only forwarding knob in play.

## Review Notes
- The core `sysctl -w net.ipv4.ip_forward=1`, `/proc/sys/net/ipv4/ip_forward`, `ip tunnel add ... mode gre`, and `ip route add ... via ...` examples are consistent with the documented Linux interfaces and command syntax.
- The GRE example uses documentation/private example address space (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), which is appropriate for a tutorial.
- Enabling `net.ipv4.ip_forward` is documented by the kernel as a special change that resets IPv4 configuration parameters to host/router defaults. The post already enables it before the later GRE and firewall steps, which is the safer order.
