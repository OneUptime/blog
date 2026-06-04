# Validation Summary: How to Run Prometheus SNMP Exporter in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Prometheus
- Prometheus SNMP Exporter
- SNMP Exporter Generator
- SNMP and MIBs
- PromQL
- Grafana

## Sources Consulted
- Prometheus SNMP Exporter official README: https://github.com/prometheus/snmp_exporter/blob/main/README.md
- Prometheus SNMP Exporter generator README: https://github.com/prometheus/snmp_exporter/blob/main/generator/README.md
- Prometheus SNMP Exporter default generator.yml: https://github.com/prometheus/snmp_exporter/blob/main/generator/generator.yml
- Prometheus SNMP Exporter generated snmp.yml: https://github.com/prometheus/snmp_exporter/blob/main/snmp.yml
- Prometheus configuration documentation: https://prometheus.io/docs/operating/configuration/
- Prometheus multi-target exporter pattern guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Docker Hub Prometheus SNMP Exporter image page: https://hub.docker.com/r/prom/snmp-exporter

## Issues Found
- The PromQL for interfaces that are operationally down but administratively up used `ifOperStatus{ifAdminStatus="1"} == 2`. `ifAdminStatus` is exported as a separate metric, not as a label on `ifOperStatus`, so the query would normally return no data. Changed it to join the two metrics with `and on(instance, ifIndex)`.
- The alert rule for down interfaces had the same `ifAdminStatus` label issue. Changed the alert expression to the same metric-matching form.
- The bandwidth utilization query divided by `(ifSpeed * 1000000)`, but SNMP Exporter exposes `ifSpeed` in bits per second. Changed the denominator to `ifSpeed`.
- The high bandwidth alert had the same `ifSpeed` unit error. Changed the denominator to `ifSpeed`.
- The troubleshooting command ran `snmpwalk` inside the SNMP Exporter container. The official image contains the exporter binary and busybox base files, not Net-SNMP tools. Changed the example to run `snmpwalk` directly from a host where Net-SNMP tools are installed.

## Review Notes
- The SNMP Exporter multi-target scrape configuration, `/snmp` endpoint, `target`, `module`, and `auth` parameters match the official exporter documentation.
- The default `if_mib` and `public_v2` auth references are current in the official SNMP Exporter documentation.
- `promtool` was not available locally, so the Prometheus snippets were reviewed against official documentation and syntax expectations rather than checked with `promtool`.
