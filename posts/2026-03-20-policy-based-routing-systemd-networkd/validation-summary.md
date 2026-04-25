# Validation Summary: How to Configure Policy-Based Routing with systemd-networkd

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- systemd-networkd
- `systemd.network` `.network` files
- Linux policy-based routing (RPDB)
- `ip rule`
- `ip route`
- IPv4 multi-homing

## Sources Consulted
- `systemd.network(5)` official documentation: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- `networkctl(1)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- `ip-rule(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- RFC 2474, Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers: https://datatracker.ietf.org/doc/html/rfc2474
- RFC 3168, The Addition of Explicit Congestion Notification (ECN) to IP: https://www.rfc-editor.org/rfc/rfc3168

## Issues Found
- The `TypeOfService=` example used `46` for DSCP EF. `TypeOfService=` matches the full 8-bit ToS/DS field, so DSCP EF (`46`) with ECN `0` is `184`. I updated the example and section heading to reflect DS-field matching accurately.
- The `ip rule show` example omitted the kernel's default RPDB rules for the `local` table at priority `0` and the `default` table at priority `32767`. I updated the sample output to show the standard rule set around the custom rule.
- The `ip route show table 200` example omitted `scope link` for the directly connected route in table `200`. I updated the sample output for accuracy.
- The `IncomingInterface=eth1` example could be read as a generic interface selector for local output traffic. I added an inline clarification that it matches packets arriving on `eth1`.

## Review Notes
- `[RoutingPolicyRule]` support in `systemd-networkd` was added in systemd `235`; `IncomingInterface=` and `OutgoingInterface=` were added in `236`; `networkctl reload` was added in `244`. The post is accurate for modern systemd releases but implicitly assumes a recent version.
- The separate connected route in table `200` is technically appropriate, because the custom table needs both the default route and a route to the directly connected subnet for policy lookups to resolve correctly.
