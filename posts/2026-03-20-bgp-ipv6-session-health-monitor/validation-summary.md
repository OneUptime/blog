# Validation Summary: How to Monitor BGP IPv6 Session Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- FRRouting (FRR)
- BFD
- Prometheus
- frr_exporter
- SNMP

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting BFD documentation: https://docs.frrouting.org/en/latest/bfd.html
- FRRouting SNMP support documentation: https://docs.frrouting.org/en/stable-10.0/snmp.html
- FRRouting source (`bgpd/bgp_vty.c`) for actual `show bgp neighbors` output fields: https://github.com/FRRouting/frr/blob/master/bgpd/bgp_vty.c
- `frr_exporter` README: https://github.com/tynany/frr_exporter
- `frr_exporter` BGP collector source: https://github.com/tynany/frr_exporter/blob/master/collector/bgp.go
- RFC 4273, BGP4-MIB: https://www.rfc-editor.org/rfc/rfc4273
- IETF draft `draft-ietf-idr-bgp4-mibv2-11`: https://datatracker.ietf.org/doc/html/draft-ietf-idr-bgp4-mibv2-11
- Prometheus query functions (`delta()`): https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The `show bgp neighbors ... | grep -A 3 "Last notification"` example did not match FRR's documented/output text. It was corrected to grep for `Last reset` and `Notification`, which are the actual fields emitted by FRR.
- The flap-detection example used `Resets|Reset reason`, but FRR exposes `Connections established ... dropped ...` and `Last reset` instead. The command was updated to match FRR's real output and the logging command was corrected from `log bgp neighbor-changes` to `bgp log-neighbor-changes` under `router bgp`.
- The BFD configuration was incomplete for FRR IPv6. FRR requires a BFD peer to be created under the `bfd` node, and the BFD docs state that `local-address` is mandatory for IPv6 peers. The example was updated accordingly.
- The `frr_exporter` section used incorrect metric names and omitted the `--collector.bgp6` flag even though the post is about IPv6. The command now enables the IPv6 collector, and the metric names were corrected to the names implemented by `frr_exporter`.
- The Prometheus alert rules referenced non-existent exporter metrics. They were updated to use `frr_bgp_peer_state` and `frr_bgp_peer_prefixes_received_count_total` with `afi="ipv6", safi="unicast"` label filters.
- The SNMP example used a brittle hard-coded `bgp4V2PeerState` index and implied SNMP would work without FRR AgentX/SNMP support being enabled. The section was corrected to note the FRR SNMP prerequisites and to use table walks to discover the actual peer index.
- The recovery script parsed the wrong field from `show bgp neighbors`; `awk '{print $NF}'` would return the uptime string instead of the BGP state. It was fixed to extract the actual state string.
- The recovery script attempted a soft reset when the session was down. A soft clear does not force reconnection of a down session, so the example was corrected to use `clear bgp ipv6 unicast <peer>` for an optional reconnect attempt.
- The `MsgRcvd/MsgSent` guidance said decreasing counters meant the session was stalled, which is incorrect for BGP message counters. The guidance was rewritten to reflect more accurate operational interpretation.

## Review Notes
- FRR supports both RFC 4273 BGP4-MIB and the older BGP4V2 Internet-Draft, but the BGP4V2 MIB is draft-based rather than an RFC-standardized MIB. Exact SNMP indexing can therefore vary by implementation, so walking the table first is safer than hard-coding an instance index.
- In `frr_exporter`, some prefix-count metrics are implemented as gauges even though their names end in `_total`. The corrected alert rule keeps `delta()` because Prometheus documents `delta()` for gauge-like series, and the exporter code emits the received-prefix count as a gauge.
