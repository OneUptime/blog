# Validation Summary: How to Configure IPv6 Firewall on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MikroTik RouterOS (6.x and 7.x)
- IPv6 addressing (static, EUI-64)
- IPv6 routing
- IPv6 firewall filter chains
- DHCPv6 server / IPv6 pools
- IPv6 Neighbor Discovery / Router Advertisements (SLAAC)
- RouterOS `/tool torch` for traffic monitoring
- ICMPv6

## Sources Consulted
- MikroTik IPv6 Neighbor Discovery: https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6+Neighbor+Discovery
- MikroTik Torch: https://help.mikrotik.com/docs/display/ROS/Torch
- MikroTik IP Addressing (eui-64): https://help.mikrotik.com/docs/spaces/ROS/pages/328247/IP+Addressing
- MikroTik Packages: https://help.mikrotik.com/docs/spaces/ROS/pages/40992872/Packages
- MikroTik Connection Tracking: https://help.mikrotik.com/docs/spaces/ROS/pages/130220087/Connection+tracking
- RFC 4291 (IPv6 Addressing Architecture) for valid hextet character set

## Issues Found

1. **Invalid IPv6 placeholder addresses.** The post used `2001:db8:wan::254`, `2001:db8:remote::/48`, and `2001:db8:lan::/64`. The letters `w`, `r`, `m`, `o`, `t`, `l`, and `n` are not valid hexadecimal digits, so these strings would be rejected by RouterOS.
   - Fix: replaced with valid hextets — `2001:db8:1::254`, `2001:db8:abcd::/48`, and `2001:db8:abcd::/64`.

2. **`/ipv6 pool` missing `prefix-length`.** The pool example only specified `prefix=...`; in RouterOS the pool also requires `prefix-length` to define the size of each delegated/assigned block.
   - Fix: added `prefix-length=64`.

3. **`/ipv6 nd` DNS parameter.** The original used `dns=2001:4860:4860::8888`, which is not the documented parameter for advertising RDNSS in RouterOS (and the original syntax also had inconsistent multi-space separation that risked tokenisation issues).
   - Fix: simplified to `advertise-dns=yes`, which causes ND to advertise the DNS servers configured in `/ip dns` (the standard MikroTik approach). Removed the unsupported `dns=` keyword.

4. **`/tool torch` IPv6 filter incorrect.** The original used `ip-protocol=ipv6`. In RouterOS, `ip-protocol` is the L4 protocol selector (tcp/udp/icmp/etc.), not the address-family selector. IPv6 frames are selected via the L2 EtherType using `mac-protocol=ipv6`.
   - Fix: replaced `ip-protocol=ipv6` with `mac-protocol=ipv6`.

## Review Notes
- The post title is "How to Configure IPv6 Firewall on MikroTik" but the body covers IPv6 addressing, routing, DHCPv6, ND, and monitoring in addition to firewall rules. Scope is broader than the title implies; not a technical defect, but worth tightening in the future.
- The Conclusion contains a slightly awkward repetition ("How to Configure IPv6 Firewall on MikroTik on MikroTik RouterOS…"). This is stylistic, not technical, so it was left untouched per the review scope.
- For RouterOS 7.x readers, the `/system package enable ipv6` step is unnecessary — IPv6 is bundled in the main package. The post does call out RouterOS 6.x for that section, so the guidance is correct, but a future revision could note the 7.x exemption explicitly.
- ICMPv6 accept rule is correctly emphasized as essential; for stricter setups, splitting ICMPv6 by type (ND, MLD, echo) per RFC 4890 would be a good follow-up topic.
