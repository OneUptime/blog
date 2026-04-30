# Validation Summary: How to Configure IPv6 on MikroTik RouterOS

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- MikroTik RouterOS
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- SLAAC
- Router Advertisements / Neighbor Discovery
- IPv6 firewall filtering
- Static IPv6 routing

## Sources Consulted
- MikroTik RouterOS documentation, "Packages": https://help.mikrotik.com/docs/spaces/ROS/pages/40992872/Packages
- MikroTik RouterOS documentation, "DHCP": https://help.mikrotik.com/docs/spaces/ROS/pages/24805500/DHCP
- MikroTik RouterOS documentation, "IP Addressing": https://help.mikrotik.com/docs/spaces/ROS/pages/328247/IP+Addressing
- MikroTik RouterOS documentation, "IPv6 Neighbor Discovery": https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6+Neighbor+Discovery
- MikroTik RouterOS documentation, "Building Advanced Firewall": https://help.mikrotik.com/docs/spaces/ROS/pages/328513/Building+Advanced+Firewall
- MikroTik RouterOS documentation, "IP Routing": https://help.mikrotik.com/docs/spaces/ROS/pages/328084/IP+Routing
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://datatracker.ietf.org/doc/html/rfc4861

## Issues Found
- The post treated IPv6 as a separate package unconditionally. Current RouterOS v7 documentation shows IPv6 functionality in the main `routeros` package, so I corrected the step to reflect v7 behavior and limited the separate `ipv6` package note to older RouterOS v6 systems.
- The DHCPv6-PD example used `use-peer-dns=yes` while the later RA section manually set `/ip dns servers` for advertisement. RouterOS documents that peer DNS overrides `/ip dns` settings, so I changed the DHCPv6 client example to `use-peer-dns=no` so the advertised DNS example is internally consistent.
- The LAN address example used `from-pool` without an `address=` suffix. RouterOS documents that `from-pool` constructs the address using the `address` property, so I corrected the command to `address=::1/64 from-pool=ISP-POOL`.
- The Router Advertisement command used `/ipv6 nd set [find interface=bridge1]`, which assumes a per-interface ND entry already exists. MikroTik’s documented workflow uses `add` for per-interface ND configuration, so I changed the example to `/ipv6 nd add interface=bridge1 ...`.
- The input firewall example accepted all link-local traffic and then dropped all other input, which both over-permitted WAN link-local traffic and blocked new management access from LAN. I corrected the rules to allow DHCPv6-PD replies explicitly, keep ICMPv6 and established traffic, and drop other input only when it is not coming from `bridge1`.
- The forward firewall example omitted an invalid-state drop and did not match MikroTik’s documented IPv6 baseline closely enough. I added the invalid drop and updated the established rule to include `untracked`, consistent with RouterOS guidance.
- The static route examples used invalid IPv6 literals (`2001:db8:remote::/48` and `2001:db8:backup::1`). I replaced them with syntactically valid documentation-prefix examples.

## Review Notes
- The post now aligns with current RouterOS v7 documentation. The only version caveat that remains is the explicit note that older RouterOS v6 systems handled IPv6 as a separate package.
- The firewall section is intentionally minimal, not a full copy of MikroTik’s advanced default IPv6 firewall. Deployments using IPsec, multicast forwarding, or stricter WAN filtering may need additional rules from MikroTik’s official firewall guidance.
- `pool-prefix-length=64` is appropriate for a single SLAAC LAN, but the usable delegated size still depends on what prefix length the ISP actually provides.
