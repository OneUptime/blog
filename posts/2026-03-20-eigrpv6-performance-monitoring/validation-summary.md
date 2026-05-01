# Validation Summary: How to Monitor EIGRPv6 Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cisco EIGRP for IPv6 (EIGRPv6)
- Cisco IOS / IOS XE routing and troubleshooting commands
- Diffusing Update Algorithm (DUAL) convergence behavior
- SNMP monitoring with `CISCO-EIGRP-MIB`
- IPv6 routing

## Sources Consulted
- Cisco IOS IP Routing: EIGRP Command Reference (`show ipv6 eigrp topology`, `show ipv6 eigrp interfaces`, `timers active-time`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/command/ire-cr-book/ire-s1.html
- Cisco IOS IPv6 Command Reference (`ipv6 bandwidth-percent eigrp`) — https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_05.html
- Cisco IOS IP Routing: EIGRP Command Reference (`ipv6 router eigrp`, `ipv6 summary-address eigrp`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/command/ire-cr-book/ire-i1.html
- Cisco IOS XE 17.13.x IP Routing Command Reference (`eigrp log-neighbor-warnings`) — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9200/software/release/17-13/command_reference/b_1713_9200_cr/ip_routing_commands.html
- Cisco IOS Debug Command Reference (`debug eigrp fsm`, `debug eigrp packets`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/e1/db-e1-cr-book/db-e1.html
- Cisco IOS IPv6 Command Reference (`show ipv6 route`, `show ipv6 route summary`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s5.html
- Cisco: Troubleshoot EIGRP Common Issues — https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/118974-technote-eigrp-00.html
- Cisco: What Does the EIGRP DUAL-3-SIA Error Message Mean? — https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/13676-18.html
- Cisco: Configuring EIGRP MIB — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/17-8/configuration_guide/rtng/b_178_rtng_9500_cg/configuring_eigrp_mib.html
- RFC 7868, Cisco's Enhanced Interior Gateway Routing Protocol (EIGRP) — https://datatracker.ietf.org/doc/rfc7868/

## Issues Found
1. **Incorrect active-route filtering guidance**: The post used `show ipv6 eigrp topology | include " A "`, which is not a reliable way to identify active routes in Cisco IOS output. I removed that example and kept the documented `show ipv6 eigrp topology active` command, which directly shows active entries.
2. **Incorrect SIA timing and timer units**: The post described the default SIA timeout as 180 seconds and then configured `timers active-time 240` as if the command accepted seconds. Cisco documents `timers active-time` in minutes, so I corrected the example to `timers active-time 4` and updated the text to describe the default behavior as approximately 3 minutes.
3. **Incorrect log filtering example**: The original `show logging | include SIA | include EIGRP` example was replaced with `show logging | include DUAL-3-SIA`, which matches the actual Cisco log mnemonic used for stuck-in-active events.
4. **Incorrect query-scope debug command**: The post used `debug ipv6 eigrp fsm`, but Cisco documents `debug eigrp fsm` and `debug eigrp packets` instead. Because the post specifically wanted to count queries, I changed it to `debug eigrp packets query`.
5. **Incorrect bandwidth verification command**: `show ipv6 eigrp interfaces detail | include BW` does not verify the configured `ipv6 bandwidth-percent eigrp` value. I changed this to `show running-config interface GigabitEthernet0/0`, which exposes the configured interface-level bandwidth-percent command.
6. **Invalid Cisco CLI example using Unix tooling**: `show ipv6 route eigrp | wc -l` mixes Cisco IOS output with a Unix utility that is not part of the Cisco CLI. I replaced it with `show ipv6 route eigrp`.
7. **Incorrect RTO explanation and threshold wording**: The post claimed `RTO = 6 × SRTT` and used a warning threshold of `>5000ms`. Cisco documentation shows 5000 ms as the maximum RTO value, so I changed the warning language to “at or near 5000ms” and removed the fixed-formula claim.
8. **Incorrect SNMP MIB object names**: The post referenced `cEigrpPeerState`, `cEigrpPeerSrtt`, and `cEigrpRouteTable`, which do not match the current Cisco EIGRP MIB object names used for IPv4/IPv6 EIGRP monitoring. I corrected the section to use documented objects such as `cEigrpPeerAddr`, `cEigrpSrtt`, `cEigrpRto`, `cEigrpActive`, and `cEigrpStuckInActive`, and added the topology-table walk.
9. **Incorrect EIGRP “area boundaries” wording**: EIGRP does not use areas like OSPF. I changed the “local area” / “area boundaries” wording to refer to affected portions of the network and interface boundaries, which matches how EIGRP query scoping and summarization actually work.

## Review Notes
- The remaining SRTT thresholds in the table are operational heuristics, not hard Cisco-defined thresholds.
- `show ipv6 eigrp neighbors`, `show ipv6 eigrp topology active`, `ipv6 bandwidth-percent eigrp`, and `timers active-time` are valid Cisco IOS / IOS XE commands for EIGRPv6 monitoring and tuning.
- Cisco documentation increasingly favors address-family style EIGRP commands on newer platforms, but the classic `show ipv6 eigrp ...` command set used in this post remains valid.
