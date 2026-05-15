# Validation Summary: How to Configure Prometheus Node Exporter on RHEL for Metrics Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Prometheus
- Prometheus Node Exporter
- systemd
- firewalld

## Sources Consulted
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus getting started documentation: https://prometheus.io/docs/tutorials/getting_started/
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter latest release: https://github.com/prometheus/node_exporter/releases/latest
- Red Hat Enterprise Linux 9 monitoring documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/

## Issues Found
- The original post did not install or start Prometheus Node Exporter, despite the title and description. It installed PCP, sysstat, and SNMP packages instead. Replaced the package installation section with commands to download and install the official Node Exporter binary.
- The original service commands enabled `pmcd`, `pmlogger`, and `sysstat`, which do not start Node Exporter. Replaced them with a Node Exporter systemd unit and `systemctl enable --now node_exporter`.
- The original configuration section listed several unrelated monitoring configuration paths but did not show a Prometheus scrape configuration for Node Exporter. Replaced it with a `scrape_configs` example targeting `localhost:9100`.
- The original verification commands checked PCP, sysstat, and Prometheus's `up` query, but did not verify the Node Exporter metrics endpoint. Replaced them with a `/metrics` check against port 9100 and a quoted Prometheus query API example.
- Removed the SNMP firewall service example because SNMP is no longer part of the corrected Node Exporter setup.

## Review Notes
The guide now uses the upstream Node Exporter release tarball and a local systemd service, which is portable for RHEL systems even when a distribution package is not available. The hardcoded version should be reviewed periodically when updating the post.
