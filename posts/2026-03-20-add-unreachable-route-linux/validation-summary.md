# Validation Summary: How to Add an Unreachable Route on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux routing
- `iproute2`
- ICMP
- Policy routing (`ip rule`)
- `systemd-networkd`

## Sources Consulted
- `ip-route(8)` from `iproute2`: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip-rule(8)` from `iproute2`: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `systemd.network(5)` from systemd: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812.html
- IANA ICMP Parameters registry: https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml

## Issues Found
- The post said Linux `unreachable` routes send ICMP network unreachable (`type 3, code 0`). `ip-route(8)` documents `unreachable` routes as generating ICMP host unreachable and returning `EHOSTUNREACH` to local senders. I corrected the description, introduction, and related command comments to use host unreachable semantics.
- The verification example expected a generic network-unreachable style message. For a locally generated `unreachable` route failure, Linux documents a host-unreachable error. I updated the expectation to avoid the wrong error class while keeping it implementation-neutral.
- The route comparison table had two protocol-level errors and one behavior issue. I changed `unreachable` from `3/0` to `3/1`, changed `prohibit` from `3/9` to `3/13` based on RFC 1812 and the IANA registry, and corrected `throw` to reflect that it terminates lookup in the current table and can result in ICMP net unreachable if no later RPDB rule resolves the packet.
- The `systemd-networkd` example was shown as a full `10-eth0.network` file but did not match `eth0`; without a valid `[Match]` section, `systemd-networkd` warns and matches all interfaces. I added a `[Match]` section with `Name=eth0`.

## Review Notes
- The `ip route add unreachable ...`, `ip route show type unreachable`, `ip rule add from ... table 100`, and `ip route del unreachable ...` commands are valid per current `iproute2` documentation.
- `systemd-networkd` route `Type=` support is present in current documentation and was added in systemd version 235, so very old distributions may not support this exact configuration.
- Review was documentation-based. A live namespace test was not possible in this environment because unprivileged namespace setup was blocked.
