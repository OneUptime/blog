# Validation Summary: How to Configure Policy-Based Routing on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux policy-based routing (RPDB / `ip rule`)
- Linux routing tables (`ip route`, `/etc/iproute2/rt_tables`)
- `iptables` packet marking (`MARK`, `owner`)
- IPv4 routing and path verification with `traceroute`

## Sources Consulted
- `ip-rule(8)` Linux manual page — https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `ip-route(8)` Linux manual page — https://man7.org/linux/man-pages/man8/ip-route.8.html
- `iptables-extensions(8)` Linux manual page — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `traceroute(8)` Linux manual page — https://man7.org/linux/man-pages/man8/traceroute.8.html
- Red Hat Enterprise Linux 10 documentation: Configuring policy-based routing to define alternative routes — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_networking/configuring-policy-based-routing-to-define-alternative-routes
- Local command help used for syntax verification: `ip rule help`, `ip route help`, `iptables -m owner -h`, `iptables -j MARK -h`, and `iptables-translate -t mangle -A OUTPUT -m owner --uid-owner root -j MARK --set-mark 100`

## Issues Found

1. **The incoming-interface example described `iif eth0` as handling multi-homed server reply traffic, which was incorrect.** Per `ip-rule(8)`, `iif` matches the incoming interface of a packet; locally generated packets are only matched as local-origin traffic when the interface is loopback. I changed the example text and inline comment to describe forwarded traffic on routers/firewalls instead of locally generated reply traffic.

2. **The `/etc/iproute2/rt_tables` wording implied that the file creates routing tables, which was imprecise.** The `ip-route(8)` documentation describes table IDs as numeric kernel routing tables that can optionally be named via `rt_tables`. I changed the example comments and takeaway text to say the file is used to register named routing tables.

3. **The `eth0rt` default-route example did not explicitly specify the egress device.** I updated `ip route add default via 192.168.1.1 table eth0rt` to `ip route add default via 192.168.1.1 dev eth0 table eth0rt` so the intended interface is explicit and consistent with `ip route` syntax.

4. **The TOS/DSCP bullet conflated policy routing with QoS prioritization.** I changed "prioritize certain traffic classes" to "route certain traffic classes differently" so it accurately describes what PBR is doing.

## Review Notes
- The `iptables` marking example is valid on current systems, including `iptables-nft`, but many modern Linux distributions prefer writing new packet-marking policy in `nftables`.
- The dual-ISP source-based example is only the PBR portion of the setup. Real internet access for RFC1918 source networks also requires prerequisites such as IP forwarding and, in typical ISP scenarios, NAT or equivalent upstream routing.
