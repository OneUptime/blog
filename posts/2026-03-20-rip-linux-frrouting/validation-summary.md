# Validation Summary: How to Configure RIP on Linux Using FRRouting

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Linux
- FRRouting
- RIP / RIPv2
- vtysh
- FRR ripd and zebra configuration
- RIP MD5 authentication

## Sources Consulted
- FRRouting RIP documentation: https://docs.frrouting.org/en/latest/ripd.html
- FRRouting basic setup documentation: https://docs.frrouting.org/en/latest/setup.html
- FRRouting zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting filtering / access-list documentation: https://docs.frrouting.org/en/latest/filter.html
- FRRouting ripd CLI source for exact `offset-list` syntax: https://github.com/FRRouting/frr/blob/master/ripd/rip_cli.c
- FRRouting ripd YANG model for defaults: https://github.com/FRRouting/frr/blob/master/yang/frr-ripd.yang
- RFC 2453, RIP Version 2: https://www.rfc-editor.org/rfc/rfc2453
- RFC 1058, Routing Information Protocol: https://www.rfc-editor.org/rfc/rfc1058

## Issues Found
- The post used `no auto-summary` and stated that disabling auto-summary is required for VLSM. FRRouting's RIP documentation and CLI do not expose this Cisco-style RIP auto-summary command; RIPv2 VLSM support is handled by using RIPv2 and prefix-length network statements. Removed the command and updated the takeaway.
- The post used the Cisco/NX-OS-style interface command `ip rip metric-offset 2`. FRRouting implements RIP metric offsets with `offset-list` under `router rip`. Replaced the example with `offset-list RIP_OFFSET in 2 eth1` and an access list that matches all routes.
- The post listed `show ip rip database`, which is not documented in FRRouting's current RIP command reference. Replaced it with the documented `show ip route` zebra command and clarified the comments for `show ip rip` and `show ip rip status`.

## Review Notes
- Current FRRouting uses `/etc/frr/frr.conf` as the integrated configuration file; the post already used this path correctly.
- The sample `show ip rip` output is representative, but exact columns can vary by FRR version.
