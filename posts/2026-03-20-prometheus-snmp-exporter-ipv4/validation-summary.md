# Validation Summary: How to Configure Prometheus SNMP Exporter for IPv4 Network Devices

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Prometheus
- Prometheus SNMP Exporter
- SNMPv2c
- SNMPv3
- PromQL
- systemd
- iptables
- IF-MIB / RFC 2863

## Sources Consulted
- Prometheus SNMP Exporter README: https://github.com/prometheus/snmp_exporter
- Prometheus SNMP Exporter releases: https://github.com/prometheus/snmp_exporter/releases
- SNMP Exporter generator README: https://github.com/prometheus/snmp_exporter/tree/main/generator
- Official systemd example for `snmp_exporter`: https://github.com/prometheus/snmp_exporter/blob/main/examples/systemd/snmp_exporter.service
- Prometheus guide on the multi-target exporter pattern: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators reference: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- RFC 2863, The Interfaces Group MIB: https://datatracker.ietf.org/doc/html/rfc2863

## Issues Found
- The install example pinned `snmp_exporter` to `0.24.1`, which was outdated. Updated it to `0.30.1`, the current release available at review time.
- The `snmp.yml` example used the wrong modern schema by embedding auth inside a module. Updated it to the current top-level `auths:` plus `modules:` structure used by current `snmp_exporter`.
- The SNMPv3 example modeled authentication as a separate module. Corrected it to use a separate auth profile (`prometheus_v3`) with the same `if_mib` module, matching the current exporter design.
- The Prometheus scrape examples were missing the `auth` URL parameter supported by current `snmp_exporter`. Added `params.auth` to both jobs and updated the manual `curl` example accordingly.
- The systemd unit used `After=network.target`. Updated it to `After=network-online.target`, which matches the official sample and is safer when binding to a specific IP address.
- The `ifOperStatus` note only documented `1=up` and `2=down`. Clarified the comment to include `7=lowerLayerDown`, which is part of the standard IF-MIB enumeration in RFC 2863.
- The alert named `HighInterfaceUtilization` was not actually measuring utilization; it was using an absolute inbound throughput threshold. Renamed it to `HighInboundTraffic` so the alert matches the expression.
- The firewall section implied UDP/162 might be needed for `snmp_exporter`. Corrected that note because `snmp_exporter` is a polling exporter and does not receive SNMP traps.

## Review Notes
- The official `snmp_exporter` documentation notes that `snmp.yml` is normally generated rather than hand-edited. The post now reflects that, while still showing a valid example of the generated file structure.
- The `ifOperStatus == 2` query and alert only match interfaces in the `down(2)` state. Interfaces in other non-up states such as `lowerLayerDown(7)` are not included unless you explicitly account for them.
- In `snmp_exporter` 0.28.0 and later, `sysUpTime` was moved out of `if_mib` into the separate `system` module. This post does not depend on `sysUpTime`, but future dashboard or alert examples should use the `system` module if they need it.
