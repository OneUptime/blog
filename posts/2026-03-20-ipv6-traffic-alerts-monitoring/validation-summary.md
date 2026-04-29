# Validation Summary: How to Create IPv6 Traffic Alerts in Monitoring Systems

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- BGP
- Prometheus alerting rules
- PromQL
- Alertmanager
- Grafana Alerting
- Prometheus Blackbox Exporter
- Prometheus Node Exporter
- Calico BGP metrics

## Sources Consulted
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager configuration: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana-managed alert rules: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/
- Grafana contact points: https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/contact-points/
- Blackbox Exporter configuration: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Node Exporter netstat collector source: https://github.com/prometheus/node_exporter/blob/master/collector/netstat_linux.go
- Calico BGP metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/bgp-metrics
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200

## Issues Found
- The IPv6 blackbox probe examples did not state that Blackbox Exporter can fall back to IPv4 by default. I added the required `preferred_ip_protocol: ip6` and `ip_protocol_fallback: false` assumption so the examples truly represent IPv6-only probes.
- The `node_exporter` routing examples used `Ip6_*` counters that are not exposed by the default `collector.netstat.fields` allowlist. I added a note that these host-side rules require the `netstat` collector to expose those counters explicitly.
- The PMTUD example treated IPv6 fragmentation failures as "fragmentation needed", which is inaccurate because IPv6 routers do not fragment in transit. I renamed the alert to `IPv6FragmentationFailures` and corrected the description to source-side fragmentation failures that can indicate MTU-related issues.
- The traffic anomaly rules used `node_netstat_Ip6_InReceives`, which is not part of Node Exporter's default netstat field allowlist. I changed those examples to `node_netstat_Ip6_InOctets`, which is documented in the default allowlist and is also a better fit for traffic-volume alerting.
- The BGP section used undocumented exporter-specific metrics (`bgp_session_state` and `bgp_prefixes_received_count`) without naming an exporter. I replaced them with Calico's documented `bgp_peers` and `bgp_routes_imported` metrics and updated the alert names and summaries to match their labels and semantics.
- The "IPv6 adoption regression" alert actually measured reachability parity between IPv6 and IPv4 blackbox probes, not end-user adoption. I renamed it to `IPv6ReachabilityRegression`, clarified the description, and added a denominator guard so the example does not divide by zero when IPv4 probe data is absent.
- The Grafana UI example used older "Alerting → Alert Rules → Create" and "Notifications" wording. I updated it to the current `Alerts & IRM -> Alert rules -> + New alert rule` flow and changed the delivery target to a `Contact point`, which matches current Grafana Alerting terminology.
- The Alertmanager snippet used deprecated `match` and `match_re` fields, omitted the root route receiver, and would stop routing before the general IPv6 route because child routes do not continue by default. I updated it to `matchers`, added `receiver: default-receiver`, and added `continue: true` so alerts can reach both the specialized receivers and the IPv6 team route.

## Review Notes
- The alert thresholds remain illustrative and should be tuned to each environment's baseline traffic and failure tolerance.
- The BGP examples are now explicitly scoped to Calico metrics; teams using FRR, Cilium, Bird, or SNMP-based exporters will need equivalent metrics and labels from their own stack.
- The routing alerts depend on Linux host counters from `node_exporter`; they do not replace device-level routing telemetry from routers or switches.
