# Validation Summary: How to Set Up Grafana Loki for Log Aggregation on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Grafana Loki
- Grafana Alloy
- Grafana
- firewalld
- systemd
- LogQL alerting

## Sources Consulted
- Grafana Loki installation documentation: https://grafana.com/docs/loki/latest/setup/install/
- Grafana Loki local installation documentation: https://grafana.com/docs/loki/latest/setup/install/local/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configuration/
- Grafana Alloy Linux installation documentation: https://grafana.com/docs/alloy/latest/set-up/install/linux/
- Grafana Alloy Linux configuration documentation: https://grafana.com/docs/alloy/latest/configure/linux/
- Grafana Alloy `loki.source.file` component reference: https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/components/loki/loki.source.file/
- Grafana on RHEL/Fedora RPM installation documentation: https://grafana.com/docs/grafana/latest/installation/rpm/
- Grafana Loki data source documentation: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The original package installation step installed PCP, sysstat, and SNMP tools instead of Grafana Loki components. Replaced it with the Grafana RPM repository setup and installation of `loki`, `alloy`, and `grafana`.
- The original service commands enabled PCP and sysstat services, which do not set up Loki log aggregation. Replaced them with `loki`, `alloy`, and `grafana-server`.
- The original configuration section listed PCP, SNMP, Prometheus, and Grafana configuration locations but did not configure Loki log ingestion. Replaced it with Loki, Alloy, and Grafana configuration locations plus a valid Alloy file-log collection example that forwards to Loki.
- The original firewall section opened Prometheus, Node Exporter, Grafana, and SNMP ports but omitted Loki's default HTTP API port. Replaced the ports with Loki `3100/tcp` and Grafana `3000/tcp`.
- The original firewall guidance did not mention Loki's lack of built-in authentication. Added a caution to expose Loki only to trusted networks or through an authenticating reverse proxy.
- The original verification commands checked metrics collection with PCP, sysstat, and Prometheus. Replaced them with Loki readiness and labels API checks.
- The original alerting guidance referenced Prometheus Alertmanager, Nagios, and Red Hat Insights for a Loki post. Updated it to Grafana-managed Loki alerts or Loki ruler alerts with Alertmanager.
- The summary described generic monitoring and used inconsistent product capitalization. Updated it to describe Grafana Loki log aggregation and log monitoring.

## Review Notes
The post is now technically aligned with a basic RHEL Loki deployment. For production use, the post could later add authentication or a reverse proxy, because Grafana Loki does not include a built-in authentication layer.
