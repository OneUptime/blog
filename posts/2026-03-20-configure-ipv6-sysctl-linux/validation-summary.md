# Validation Summary: How to Configure IPv6 sysctl Parameters on Linux

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux kernel IPv6 stack
- `sysctl` command (procps-ng)
- `/proc/sys/net/ipv6/` virtual filesystem
- `/etc/sysctl.d/` drop-in configuration files
- IPv6 networking concepts: SLAAC, Router Advertisements, DAD, ICMPv6 redirects, privacy extensions (RFC 4941/8981), stable privacy addressing (RFC 7217)

## Sources Consulted
- Linux kernel networking documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Kernel source `Documentation/networking/ip-sysctl.rst` (master): https://raw.githubusercontent.com/torvalds/linux/master/Documentation/networking/ip-sysctl.rst
- Linux kernel header `include/uapi/linux/if_link.h` (`enum in6_addr_gen_mode`)
- RFC 7217 — A Method for Generating Semantically Opaque Interface Identifiers
- RFC 4941 / 8981 — Privacy Extensions for SLAAC
- Live verification against `/proc/sys/net/ipv6/conf/*/` on a current Linux system

## Issues Found
1. **Incorrect `addr_gen_mode` value for stable privacy addressing.** The persistent-config example set `net.ipv6.conf.all.addr_gen_mode = 1` and `net.ipv6.conf.default.addr_gen_mode = 1` with the comment "Stable privacy addressing (random but stable per host/prefix)". Per the kernel `enum in6_addr_gen_mode` and `ip-sysctl.rst`, value `1` means "do not generate a link-local address, use EUI64 for autoconf" — **not** stable privacy. RFC 7217 stable privacy is value `2` (using `stable_secret`), and value `3` uses a random secret if unset. Changed both lines to `2` and added a short comment noting that `stable_secret` must be set, or that mode `3` can be used to let the kernel pick a random secret automatically.

## Review Notes
- All listed default values in the "Common IPv6 sysctl Parameters" table match the kernel defaults documented in `ip-sysctl.rst` (`forwarding=0`, `accept_ra=1`, `autoconf=1`, `disable_ipv6=0`, `use_tempaddr=0`, `dad_transmits=1`, `accept_redirects=1`, `addr_gen_mode=0`). Note that several distributions (notably NetworkManager and systemd-networkd defaults) override `use_tempaddr` and `addr_gen_mode` per-interface, so the userspace-observed defaults can differ from the kernel defaults shown here.
- The "Priority order: interface-specific > all > default" statement is a common simplification. In reality, the interaction between `all.<param>` and `<iface>.<param>` is parameter-specific — for some parameters (e.g. `forwarding`) writing to `all` propagates to all interfaces; for booleans like `accept_redirects` the effective value is the AND of `all` and per-interface; `default` only seeds new interfaces. The simplification is acceptable for an introductory guide and was left in place.
- `accept_ra=2` (used in the runtime example) is correctly the value that accepts RAs even when forwarding is enabled.
- For `addr_gen_mode = 2` to take effect for autoconfigured global addresses, `stable_secret` must be written first (and on many kernels the value is write-once per boot per interface). The added inline comment now points readers at this caveat.
- `sysctl -p <file>` and `sysctl --system` are both correct and current; `sysctl --system` reads `/etc/sysctl.conf` plus the standard `sysctl.d` directories per `man sysctl(8)`.
- Writing directly to `/proc/sys/net/ipv6/conf/<iface>/...` requires root; the post does not call this out explicitly but the same is true of `sysctl -w`, so no change made.
