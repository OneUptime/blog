# Validation Summary: How to Configure CAKE qdisc for IPv4 Bandwidth Management on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux traffic control (`tc`)
- CAKE qdisc
- IFB (`ifb`) virtual interfaces
- IPv4 traffic shaping and QoS
- `iproute2`

## Sources Consulted
- Upstream `tc-cake(8)` man page: https://man7.org/linux/man-pages/man8/tc-cake.8.html
- Linux kernel `tc` netlink specification: https://docs.kernel.org/6.9/networking/netlink_spec/tc.html
- `tc(8)` man page: https://man7.org/linux/man-pages/man8/tc.8.html
- Local `man tc-cake` output from the installed `iproute2` package
- Local `tc qdisc add dev lo root cake help` output
- Local `man ip-link` output and `modinfo ifb`

## Issues Found
- The installation section claimed CAKE required `iproute2 5.4+`. I changed this to state that CAKE is available in upstream Linux starting with kernel 4.19 and that `tc` must be built with CAKE support, because the hard `5.4+` requirement was inaccurate.
- The multiline `tc` example used inline comments after shell line-continuation backslashes, which breaks the command in POSIX shells. I moved the explanations to separate comment lines and kept the command executable.
- The parameter example used `dual-dsthost` on a root WAN qdisc intended for uplink shaping. I corrected it to `dual-srchost`, which `tc-cake(8)` documents for LAN-to-Internet egress fairness.
- The `diffserv3` and `diffserv4` tin descriptions were listed in reverse order. I corrected them to match the documented CAKE tin order.
- The IFB download and upload examples had the host-isolation modes reversed. I changed download shaping to `dual-dsthost` and upload shaping to `dual-srchost`, matching CAKE's documented ingress/downlink and egress/uplink guidance.
- The IFB download examples were missing CAKE's `ingress` mode. I added `ingress` so the downlink examples match the documented behavior for shaping traffic that has already traversed the bottleneck.
- The monitoring section showed representative tin labels that did not match CAKE's actual stats presentation. I replaced that with a technically accurate note about per-tin counters and latency statistics.
- The home-router PPPoE example used `overhead 18 pppoe-vcmux`, which double-counts overhead because `pppoe-vcmux` already expands to `overhead 32 atm`. I removed the extra manual overhead setting.
- The IFB setup explicitly loaded the module before creating `ifb0`. I changed this to direct `ip link add ifb0 type ifb` creation, which is supported by `ip-link` and avoids collisions with kernels that pre-create IFB devices.

## Review Notes
- The post is correctly scoped to IPv4 because the redirect filter uses `protocol ip`. An IPv6-capable version would need an additional IPv6 filter.
- `split-gso` is enabled by default in current CAKE implementations, so its inclusion in the example is explicit rather than required.
