# Validation Summary: How to Monitor OSPFv3 Performance and Convergence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OSPFv3 (RFC 5340)
- IPv6 routing
- FRRouting (FRR) ospf6d / vtysh
- Cisco IOS OSPFv3 (router ospfv3 mode with address-family)
- OSPFV3-MIB (RFC 5643) with net-snmp
- Prometheus + frr_exporter (tynany/frr_exporter)
- systemd journalctl

## Sources Consulted
- FRR ospf6d documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- FRR source `lib/libospf.h` for SPF timer defaults: https://github.com/FRRouting/frr/blob/master/lib/libospf.h
- frr_exporter README: https://github.com/tynany/frr_exporter
- RFC 5643 (OSPFv3 Management Information Base): https://datatracker.ietf.org/doc/html/rfc5643
- RFC 5340 (OSPF for IPv6) for protocol timer definitions
- Cisco OSPFv3 configuration guide for `router ospfv3` / `address-family` syntax

## Issues Found

1. **Wrong FRR show command (`show ipv6 ospf` → `show ipv6 ospf6`).** FRR's OSPFv3 daemon (ospf6d) uses commands prefixed with `ipv6 ospf6`, not `ipv6 ospf`. The original command would simply not be recognized. Corrected in the FRRouting monitoring section and in the Summary.

2. **Non-existent FRR subcommand `show ipv6 ospf database count`.** FRR has no `count` subcommand for the OSPFv3 database. Replaced with the actual `show ipv6 ospf6 database` command, plus a small `awk` example demonstrating how to count entries by LSA type.

3. **Incorrect claim about FRR exposing a gRPC telemetry API.** frr_exporter does not use a gRPC telemetry API; it connects directly to the FRR daemon Unix sockets (default in `/var/run/frr`), with an optional vtysh mode. Reworded the comment to reflect how it actually works. Default port 9342 was already correct.

4. **Incorrect SNMP OID names (RFC 5643).** The post listed `ospfv3SpfRuns.0`, `ospfv3IfStateChangeCount`, and `ospfv3NbrStateChangeCount`. Per RFC 5643 these objects do not exist; the correct names are `ospfv3AreaSpfRuns` (in `ospfv3AreaTable`), `ospfv3IfEvents` (in `ospfv3IfTable`), and `ospfv3NbrEvents` (in `ospfv3NbrTable`). Also fixed the example query: these are columnar table objects, not scalars, so `snmpget ... .0` is wrong — replaced with `snmpwalk` against `ospfv3AreaSpfRuns`.

5. **Inaccurate default SPF timer values.** The post claimed SPF Delay default = 200ms and SPF Hold default = 1000ms. FRR's actual defaults from `lib/libospf.h` are 0 / 50 / 5000 ms (delay / initial-hold / max-hold). Cisco's traditional default is 5000 / 10000 / 10000 ms. Updated the table to reflect the per-vendor defaults rather than fictional cross-vendor values, and renamed the row to "SPF Initial Hold" to match the actual `timers throttle spf` semantics.

6. **Minor typo in FRR config comment.** Fixed `! timerspf delay initial-hold max-hold` → `! timers throttle spf delay initial-hold max-hold` so the comment matches the actual command syntax used on the next line.

## Review Notes

- The Cisco syntax (`router ospfv3 1` with `address-family ipv6 unicast`, interface-level `ospfv3 hello-interval`/`dead-interval`, `log-adjacency-changes detail`, `show ospfv3 statistics`) is correct for current Cisco IOS OSPFv3 (the unified address-family-aware OSPFv3 process).
- The grep alternation `"ospf6\|FULL\|DOWN\|2WAY"` works in GNU grep's basic regex via `\|`; this is portable enough for the FRR-on-Linux context but `grep -E "ospf6|FULL|DOWN|2WAY"` would be more conventional.
- `timers throttle spf 50 200 5000` is valid in both FRR ospf6d and Cisco OSPFv3 address-family mode; left unchanged as it is presented as a tuning recommendation rather than a default.
- Hello-interval of 1 / dead-interval of 3 is aggressive — fine for "critical links" framing but worth flagging in future posts as risking false-positive neighbor drops on lossy media. Not a correctness issue.
- The frr_exporter metric names (`frr_ospf6_spf_calculations_total`, etc.) are illustrative; exact metric names depend on the exporter version. Left as-is since the post is showing patterns, not exact contracts.
