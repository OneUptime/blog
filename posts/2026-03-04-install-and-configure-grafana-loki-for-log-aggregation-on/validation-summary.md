# Validation Summary: How to Install and Configure Grafana Loki for Log Aggregation on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Grafana Loki
- Grafana RPM repository
- DNF
- systemd
- Bash

## Sources Consulted
- Grafana Loki documentation, "Install Grafana Loki locally": https://grafana.com/docs/loki/latest/setup/install/local/
- Grafana Loki documentation, "Install Loki": https://grafana.com/docs/loki/latest/setup/install/
- Grafana Loki documentation, "Grafana Loki configuration parameters": https://grafana.com/docs/loki/latest/configure/
- Grafana Loki documentation, "Loki HTTP API": https://grafana.com/docs/loki/latest/api/
- Grafana Alloy documentation, "Install Grafana Alloy on Linux": https://grafana.com/docs/alloy/latest/set-up/install/linux/
- Grafana RPM repository metadata for the `loki` package: https://rpm.grafana.com/

## Issues Found
- The installation command installed `grafana` instead of `loki`. It now installs the `loki` RPM package from the Grafana repository.
- The repository example was missing the TLS verification settings shown in Grafana's current RHEL/Fedora RPM repository instructions. The repo block now includes `sslverify=1` and the RHEL CA bundle path.
- The service and configuration examples used placeholders such as `/etc/<service>/config.conf` and `<service-name>`, which would not work as written. They now use the Loki RPM package paths and service name: `/etc/loki/config.yml` and `loki`.
- The configuration guidance mentioned generic authentication settings. Loki does not provide user authentication itself, so the wording now specifically references `auth_enabled` and the `X-Scope-OrgID` tenant header.
- Verification only checked systemd state and logs. The post now also checks Loki's `http://localhost:3100/ready` readiness endpoint.
- Troubleshooting commands used placeholders for the service and package name. They now use `loki`.

## Review Notes
The corrected steps cover a basic single-node Loki RPM installation. For a complete log aggregation pipeline, a log collector such as Grafana Alloy still needs to be installed and configured to send logs to Loki.
