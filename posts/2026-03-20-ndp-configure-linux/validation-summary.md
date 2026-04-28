# Validation Summary: How to Configure NDP Parameters on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel IPv6 stack
- IPv6 Neighbor Discovery Protocol (NDP)
- sysctl / `/proc/sys/net/ipv6/`
- Neighbor Unreachability Detection (NUD)
- Router Advertisements (RA) and SLAAC
- Duplicate Address Detection (DAD)
- IPv6 privacy extensions (RFC 4941)

## Sources Consulted
- Linux kernel `Documentation/networking/ip-sysctl.rst` (sections on `net.ipv6.neigh.*`, `net.ipv6.conf.*`, `forwarding`, `accept_ra`, `accept_ra_pinfo`, `accept_ra_rtr_pref`, `accept_redirects`, `dad_transmits`, `autoconf`, `gc_thresh*`, `gc_stale_time`)
- Linux kernel sources: `net/ipv6/ndisc.c`, `include/net/ndisc.h`, `net/core/neighbour.c` (compile-time defaults: `ND_REACHABLE_TIME = 30*HZ`, `NEIGH_VAR_DELAY_PROBE_TIME = 5*HZ`, `ND_RETRANS_TIMER = HZ`, `NEIGH_VAR_UCAST_PROBES = 3`, `NEIGH_VAR_MCAST_PROBES = 3`)
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 4941 (Privacy Extensions for Stateless Address Autoconfiguration)

## Issues Found
1. **Incorrect claim about `accept_ra` behavior under `forwarding=1`.** The post originally stated: "When forwarding=1: accept_ra defaults to 2 (accept but don't process as host)". This is wrong. Per the kernel docs, `accept_ra=1` is the *literal* default and means "accept RA only if forwarding is disabled" — when forwarding is enabled, RAs are *ignored by default*. `accept_ra=2` is an explicit administrator override ("accept RAs even if forwarding is enabled"), not a value the kernel automatically sets. Fixed the comment in the security-hardening sysctl block to accurately describe this behavior.

## Review Notes
- All sysctl default values listed in the "Key NDP sysctl Parameters" section match the Linux kernel's compile-time defaults and the documentation in `ip-sysctl.rst`. Note that several of these (`accept_ra`, `accept_ra_pinfo`, `accept_ra_rtr_pref`, `accept_redirects`, `autoconf`) are *functional* defaults — their effective behavior is conditional on `forwarding`. The post's listed default of `1` reflects the value users will see when reading the sysctl on a typical host (forwarding disabled), which is the right thing to show readers.
- `use_tempaddr` shown as "0 or 2" is reasonable: the kernel default is 0, but most desktop distros (NetworkManager / systemd-networkd setups) set it to 2 via drop-in configs.
- The "~3-4 seconds instead of ~40 seconds" failure-detection estimate in the fast-failover section is in the right ballpark but slightly optimistic in the worst case (REACHABLE has a random factor up to 1.5×base, so worst case is closer to ~9s with the tuned values vs. ~50s default). Acceptable as a rough order-of-magnitude figure.
- The post applies sysctl values to `eth0` literally; readers on systemd-named interfaces (e.g. `enp0s3`, `ens3`) will need to substitute their actual interface name. This is conventional in Linux tutorials and not a technical error.
