# Validation Summary: How to Monitor VXLAN over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VXLAN (Linux kernel implementation)
- IPv6 underlay
- Prometheus (node exporter, textfile collector, alerting rules, PromQL)
- Grafana
- FRRouting (vtysh) for BGP EVPN
- iproute2 (`ip link`, `bridge fdb`)
- Bash scripting

## Sources Consulted
- Prometheus node_exporter metrics reference (network collector exposes `node_network_transmit_bytes_total`, `node_network_transmit_errs_total`, etc.) — https://github.com/prometheus/node_exporter
- Prometheus textfile collector documentation — https://github.com/prometheus/node_exporter#textfile-collector
- Prometheus configuration — IPv6 target syntax with bracket notation (`[ipv6]:port`) — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- iproute2 manpages: `ip-link(8)`, `bridge(8)` for `ip link show type vxlan`, `ip -d link show`, `bridge fdb show dev`
- iputils `ping6` (still available on most distributions as symlink/wrapper around `ping -6`)
- FRRouting BGP EVPN vtysh command reference (`bgpd/bgp_evpn_vty.c`) — https://github.com/FRRouting/frr — for valid `show bgp l2vpn evpn route type <X>` keywords
- Prometheus alerting rule format — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- **FRR vtysh route type keywords were incorrect.** The script used `show bgp l2vpn evpn route type mac-ip` and `show bgp l2vpn evpn route type ip-prefix`, but FRR accepts neither hyphenated form. Per `bgpd/bgp_evpn_vty.c`, the valid keywords are `macip` (Type-2) and `prefix` (Type-5) (along with `ead`, `multicast`, `es`, or numeric `1`–`5`). Updated the two `vtysh -c` calls to use `type macip` and `type prefix` respectively. Without this fix, both commands would have failed with a CLI parse error and the script would always have emitted `0` for both metrics.

## Review Notes
- `ping6` is functional but considered legacy on modern iputils-based distributions; `ping -6` is the contemporary form. Left as-is since `ping6` still exists as a wrapper on virtually all current distros and matches the post's tone.
- The PromQL sample references metrics like `vtep_ping_success_total`, `vtep_ping_total`, and `vtep_ping_rtt_ms` that are not produced by the scripts shown in the post — readers would need to add a separate ICMP/blackbox exporter or extend the textfile script to populate them. The post presents them as illustrative queries, which is a reasonable framing, but a reader following along verbatim won't get data for those panels.
- The IPv6 target syntax `[2001:db8:1::1]:9100` in Prometheus `static_configs` is correct and matches the relabel regex `\[(.+)\]:\d+`.
- `node_network_transmit_bytes_total` and `node_network_transmit_errs_total` are the correct current node_exporter metric names (the older `_bytes` / `_errs` non-`_total` names were removed years ago).
- Alerting rule YAML structure (`groups[].rules[]` with `alert`, `expr`, `for`, `labels`, `annotations`) matches the current Prometheus alerting rule schema.
