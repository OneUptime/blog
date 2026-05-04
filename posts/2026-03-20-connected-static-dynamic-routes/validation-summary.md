# Validation Summary: How to Understand Connected, Static, and Dynamic Routes

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux iproute2 (`ip route`, `ip addr`, `ip link`)
- IPv4 routing concepts (connected, static, dynamic routes)
- systemd-networkd configuration
- FRR (Free Range Routing) and OSPF
- vtysh CLI
- Cisco administrative distance (for comparison)

## Sources Consulted
- ip-route(8) man page — https://man7.org/linux/man-pages/man8/ip-route.8.html
- ip-address(8) man page — https://man7.org/linux/man-pages/man8/ip-address.8.html
- FRR Static Routes documentation — https://docs.frrouting.org/en/latest/static.html
- FRR Zebra documentation — https://docs.frrouting.org/en/latest/zebra.html
- FRR OSPF documentation — https://docs.frrouting.org/en/latest/ospfd.html
- systemd.network(5) man page — https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Cisco "What Is Administrative Distance?" — https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/15986-admin-distance.html
- Linux kernel rtnetlink.h (RTPROT_* values)

## Issues Found

1. **Incorrect claim about Linux static route administrative distance.** The post said "Static routes on Linux have an administrative distance of 1 by default." This is wrong on two counts: (a) the Linux kernel routing engine does not implement a Cisco-style administrative distance — it uses per-route metrics where lower wins; (b) the default metric for a route added via `ip route add` is 0, not 1. The AD=1 figure is what FRR uses for its static configuration, not what the kernel exposes. Replaced with: "Static routes added with `ip route` use a default metric of 0 on Linux — the kernel does not implement Cisco-style administrative distance, only per-route metrics where lower wins. Use the `metric` keyword to make a route less preferred."

2. **Incorrect Linux value in the comparison table.** The "Linux Metric" column listed Static as `1`. The correct default metric for a static route added via `ip route add` is `0`. Changed `Static | 1` to `Static | 0` and renamed the column header from "Linux Metric" to "Linux default metric" to clarify that this is the kernel metric (priority), not an AD-equivalent.

## Review Notes

- The `ip route show proto ospf` command is correct for modern FRR (5.x+) on kernels that include `RTPROT_OSPF` (188), as FRR installs OSPF-learned routes with the OSPF protocol identifier rather than as `proto zebra`. On older FRR/kernel combinations, routes may instead appear under `proto zebra`.
- The example default route `ip route add default via 192.168.10.1` reuses the same address that was assigned to `eth0` earlier in the post (`192.168.10.1/24`). In a real configuration the next-hop must be a different host on the link; this is fine as standalone syntax illustration but a reader copying both examples wholesale would have an invalid setup. Left as-is since the syntax itself is correct and the section is intentionally illustrative.
- The systemd-networkd snippet is correct (`Gateway=` and `Destination=` under a `[Route]` section). For completeness a future revision could note that `Metric=` is also available there.
- The FRR vtysh session shown is presented as a stream of lines rather than an interactive prompt; this is a stylistic choice and matches how many tutorials present vtysh configuration.
- Cisco AD values in the comparison table (Connected=0, Static=1, eBGP=20, OSPF=110, RIP=120) are all correct.
