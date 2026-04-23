# Validation Summary: How to Understand the Routing Information Base vs Forwarding Information Base

## Status
validated

## Post Type
Guide

## Technologies Covered
- Routing Information Base (RIB)
- Forwarding Information Base (FIB)
- FRRouting (FRR) and zebra
- Linux kernel routing tables and iproute2
- Hardware forwarding tables, TCAM, ASIC, and LPM resources

## Sources Consulted
- FRRouting Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting zebra CLI source: https://github.com/FRRouting/frr/blob/master/zebra/zebra_vty.c
- Linux ip-route(8) manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel LC-trie/FIB lookup documentation: https://docs.kernel.org/networking/fib_trie.html
- Linux kernel VRF documentation: https://docs.kernel.org/networking/vrf.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 3222, Terminology for FIB based Router Performance: https://www.rfc-editor.org/rfc/rfc3222.html
- RFC 8430, RIB Information Model: https://www.rfc-editor.org/rfc/rfc8430.html
- Cisco Catalyst 9000 IPv4 hardware resources documentation: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-9300-series-switches/217714-understand-ipv4-hardware-resources-on-ca.html
- Cisco Catalyst 6500/6800 Supervisor 6T architecture white paper: https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-6500-series-switches/white-paper-c11-737405.html
- Juniper Junos routing and forwarding table overview: https://www.juniper.net/documentation/us/en/software/junos/junos-overview/topics/concept/junos-software-routing-forwarding-table-overview.html

## Issues Found
- The post overstated FRR's zebra RIB as containing all learned protocol-internal non-best paths. Updated the text to describe zebra as holding routing candidates from protocols and selecting the best entry across protocols, matching FRR documentation.
- `vtysh -c "show ip route detail"` is not the current FRR zebra command form for detailed route output. Replaced it with `vtysh -c "show ip route 10.20.0.0/24"` for detailed state on a specific prefix.
- The Linux FIB wording treated `ip route show` as the entire kernel FIB. Clarified that it shows the main table by default and added `ip route show table all` for all kernel routing tables.
- The comparison command used `grep "^[OBSC]"`, which could also match FRR header text such as `Codes:` and exclude valid route types. Replaced it with direct FRR and Linux route commands.
- The `*` marker explanation was narrowed to data-plane/FIB installation, with Linux kernel FIB called out only when Linux is the data plane.
- The hardware FIB section implied all hardware FIBs are TCAM-only and always overflow to software forwarding. Updated it to mention ASIC tables such as TCAM, hash tables, and LPM resources, and to describe resource exhaustion as platform-specific.
- The FIB lookup diagram treated a default route as a no-match case. Updated it to show default route as a valid longest-prefix match.
- `ip -s route show cache` was outdated because IPv4 route cache entries are no longer present on Linux 3.6 and newer. Replaced it with current route-table counting commands and `ip route get` for an actual kernel route lookup.
- `/proc/net/route` was described as raw detailed kernel routing statistics. Reworded it as legacy raw IPv4 route table output.

## Review Notes
Local `iproute2` 6.1.0 was available and used to verify `ip route`, `ip route get`, and `ip monitor route` syntax. `vtysh` was not installed locally, so FRR command syntax was verified against official FRRouting documentation and the FRRouting zebra CLI source.
