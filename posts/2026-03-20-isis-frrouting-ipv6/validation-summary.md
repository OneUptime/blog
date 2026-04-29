# Validation Summary: How to Configure IS-IS on FRRouting for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- FRRouting
- IS-IS
- IPv6
- Linux routing
- `vtysh`

## Sources Consulted
- FRRouting IS-IS documentation: https://docs.frrouting.org/en/stable-10.5/isisd.html
- FRRouting Basic Setup documentation: https://docs.frrouting.org/en/stable-10.5/setup.html
- FRRouting Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting official source for IS-IS CLI/docs: https://github.com/FRRouting/frr/blob/master/doc/user/isisd.rst
- RFC 5308, Routing IPv6 with IS-IS: https://datatracker.ietf.org/doc/html/rfc5308
- RFC 5120, Multi-Topology Routing in IS-IS: https://datatracker.ietf.org/doc/html/rfc5120
- RFC 1195, Use of OSI IS-IS for routing in TCP/IP and dual environments: https://datatracker.ietf.org/doc/html/rfc1195
- `man 8 ip-route`

## Issues Found
- The installation section enabled `isisd` but not `zebra`. Current FRR documentation states `isisd` depends on `zebra`, so the post was corrected to enable both daemons before restarting FRR.
- The interface examples used `isis ipv6 metric`, which is not a current FRR IS-IS CLI command. The config was corrected to use supported `isis metric` commands.
- The NET-address section showed `ip link show lo | grep "link/ether"` while describing the MAC address of a management interface. Loopback uses `link/loopback`, not `link/ether`, so the example was corrected to use `eth0`.
- The verification section used `show isis topology ipv6-unicast`, which does not match the documented show-command syntax. It was corrected to `show isis topology level-2`.
- The redistribution example used `redistribute ipv6 connected` and `redistribute ipv6 static`, but current FRR IS-IS documents route-table redistribution syntax instead. The example was corrected to `redistribute ipv6 table 254 level-2`, which uses Linux's main routing table.
- The per-interface authentication example used `isis authentication mode md5` and `isis authentication key-chain`, which are not current FRR IS-IS interface commands. It was corrected to the documented `isis password md5 ...` syntax.
- The summary said IPv6 IS-IS requires both `ip router isis` and `ipv6 router isis`. That overstates the requirement; `ipv6 router isis` is the IPv6-specific activation, while `ip router isis` is only needed if IPv4 should also participate.

## Review Notes
- Current FRR defaults to `metric-style wide`, and FRR's source indicates multi-topology IS-IS requires wide metrics. The post is valid as written after correction because current FRR already defaults to wide metrics.
- `topology ipv6-unicast` is present in FRR's official CLI/source and examples, but it is not described as prominently in the rendered user guide as some other IS-IS commands.
