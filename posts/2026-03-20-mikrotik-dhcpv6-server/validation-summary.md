# Validation Summary: How to Configure DHCPv6 Server on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MikroTik RouterOS (6.40+ and 7.x)
- IPv6 addressing (static, EUI-64)
- IPv6 routing
- IPv6 firewall filter chains
- DHCPv6 server / IPv6 pools
- IPv6 Neighbor Discovery / Router Advertisements (SLAAC)
- RouterOS `/tool torch` for traffic monitoring
- ICMPv6

## Sources Consulted
- MikroTik IPv6 DHCP Server: https://help.mikrotik.com/docs/spaces/ROS/pages/40992871/IPv6+DHCP+Server
- MikroTik IPv6 Neighbor Discovery: https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6+Neighbor+Discovery
- MikroTik IPv6 Pool: https://help.mikrotik.com/docs/spaces/ROS/pages/40992866/IPv6+Pool
- MikroTik Torch: https://help.mikrotik.com/docs/display/ROS/Torch
- MikroTik IP Addressing (eui-64): https://help.mikrotik.com/docs/spaces/ROS/pages/328247/IP+Addressing
- MikroTik Packages: https://help.mikrotik.com/docs/spaces/ROS/pages/40992872/Packages
- RFC 4291 (IPv6 Addressing Architecture) for valid hextet character set
- RFC 8415 (DHCPv6)

## Issues Found

1. **Invalid IPv6 placeholder addresses.** The post used `2001:db8:wan::254`, `2001:db8:remote::/48`, and `2001:db8:lan::/64`. The letters `w`, `r`, `m`, `o`, `t`, `l`, and `n` are not valid hexadecimal digits, so these strings would be rejected by RouterOS's address parser.
   - Fix: replaced with valid hextets — `2001:db8:1::254`, `2001:db8:abcd::/48`, and `2001:db8:abcd::/64`.

2. **`/ipv6 pool` missing `prefix-length`.** The pool example only specified `prefix=...`. In RouterOS the pool also needs `prefix-length` to define the size of each delegated/assigned block, otherwise the DHCPv6 server cannot hand out prefixes deterministically.
   - Fix: added `prefix-length=64`.

3. **`/tool torch` IPv6 filter incorrect.** The original used `ip-protocol=ipv6`. In RouterOS, `ip-protocol` is the L4 protocol selector (tcp/udp/icmp/etc.), not the address-family selector. IPv6 frames are selected at L2 via the EtherType using `mac-protocol=ipv6`.
   - Fix: replaced `ip-protocol=ipv6` with `mac-protocol=ipv6`.

## Review Notes
- The post title is "How to Configure DHCPv6 Server on MikroTik" but the body covers IPv6 addressing, routing, firewall, ND, and monitoring in addition to the DHCPv6 server itself. Scope is broader than the title implies; not a technical defect, but worth tightening in the future.
- The Conclusion contains a slightly awkward repetition ("How to Configure DHCPv6 Server on MikroTik on MikroTik RouterOS…"). This is stylistic, not technical, so it was left untouched per the review scope.
- For RouterOS 7.x readers, the `/system package enable ipv6` step is unnecessary — IPv6 is bundled in the main package. The post does call out RouterOS 6.x for that section, so the guidance is correct, but a future revision could note the 7.x exemption explicitly.
- MikroTik's DHCPv6 server is most commonly used for prefix delegation (IA_PD); to delegate /64s from a larger pool, a wider prefix (e.g., `2001:db8::/48 prefix-length=64`) would be more realistic than the single-/64 example shown. The example is technically valid as-is, just narrow in scope.
- For SLAAC + DHCPv6 stateless, `managed-address-configuration=no other-configuration=no` (as shown) is correct; for stateful DHCPv6 IA_NA, both flags would need to be set to `yes`. The post does not distinguish between these modes, which a future revision could clarify.
- ICMPv6 accept rule is correctly emphasized as essential; for stricter setups, splitting ICMPv6 by type (ND, MLD, echo) per RFC 4890 would be a good follow-up topic.
