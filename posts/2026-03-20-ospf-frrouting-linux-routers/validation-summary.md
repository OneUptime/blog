# Validation Summary: How to Set Up OSPF on FRRouting (FRR) for Linux Routers

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- FRRouting (FRR) — open source routing suite
- OSPF (Open Shortest Path First) — IGP routing protocol
- vtysh — FRR's integrated CLI shell
- Linux networking (sysctl IP forwarding, iproute2)
- systemd (frr.service)

## Sources Consulted
- FRR official OSPF documentation: https://docs.frrouting.org/en/latest/ospfd.html
- FRR setup / daemons configuration: https://docs.frrouting.org/en/latest/setup.html
- FRR basic configuration: https://docs.frrouting.org/en/latest/basic.html
- iproute2 `ip route` man page (proto support)

## Issues Found
- **Step 4: invalid interface OSPF syntax.** The post used `ip ospf 1 area 0` to activate OSPF on an interface. The FRR `ospfd` interface-mode configuration command is documented as `ip ospf area AREA [ADDR]` — there is no documented `ip ospf <instance> area <area>` form. The instance ID is only valid at the `router ospf <1-65535>` level (and on certain `show`/`clear` commands), not on the interface configuration line. Changed `ip ospf 1 area 0` → `ip ospf area 0` so the example matches the single `router ospf` process configured earlier in the post.

## Review Notes
- The `/etc/frr/daemons` `ospfd=yes` / `zebra=yes` toggling is correct for current FRR versions; on most distributions `zebra=yes` is already the default, so the `sed` for zebra is harmless but often a no-op.
- Step 5's `frr.conf` uses interface-mode (`ip ospf area 0` on the interface) only, which is fine. FRR docs warn that mixing interface-mode `ip ospf area` with `network ... area` under `router ospf` on the same router is not supported — readers should pick one approach. The post itself does not mix them in any single example, so this is just a future caveat to call out.
- Both `passive-interface IFNAME` (router mode) and `ip ospf passive` (interface mode) are accepted by FRR, so Step 5's combination of `passive-interface default` plus `no passive-interface eth0` together with `ip ospf passive` on eth1 is valid (redundant on eth1, but not incorrect).
- The `show ip ospf neighbor` sample output omits the trailing `RXmtL RqstL DBsmL` columns that real FRR output prints, but the displayed columns and values are accurate; readers will see additional columns in practice.
- Authentication example uses MD5 (`message-digest`), which is still supported but cryptographically dated. A future revision could mention HMAC-SHA key-chain authentication available in newer FRR releases.
