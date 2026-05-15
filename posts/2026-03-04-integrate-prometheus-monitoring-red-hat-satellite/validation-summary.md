# Validation Summary: How to Integrate Prometheus Monitoring with Red Hat Satellite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Satellite Server
- Performance Co-Pilot (PCP)
- PCP PMDAs for Apache HTTP Server, PostgreSQL, Redis, and OpenMetrics
- Prometheus
- Grafana
- firewalld

## Sources Consulted
- Red Hat Satellite 6.18 documentation, "Monitoring Satellite performance": https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html-single/monitoring_satellite_performance/monitoring_satellite_performance
- Red Hat Enterprise Linux 9 documentation, "Monitoring and managing system status and performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/
- Red Hat Enterprise Linux 9 documentation, "Configuring basic system settings" systemd service management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/
- Prometheus documentation, configuration file and scrape configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus documentation, HTTP API query endpoint: https://prometheus.io/docs/prometheus/3.5/querying/api/

## Issues Found
- The original guide did not actually configure Red Hat Satellite metrics for Prometheus. I replaced the generic RHEL package list and placeholder configuration guidance with Red Hat's documented Satellite PCP package installation, Satellite telemetry enablement, OpenMetrics PMDA setup, and a Prometheus scrape configuration for the Satellite `/metrics` endpoint.
- The original guide enabled `sysstat` even though sysstat was unrelated to the Prometheus/Satellite integration. I removed the sysstat service command and verification command.
- The original firewall section opened Node Exporter and SNMP ports without installing or configuring either component. I narrowed the firewall commands to Prometheus and Grafana only when those services are hosted on the system.
- The original verification used a generic Prometheus `up` query without tying it to a Satellite scrape target. I changed it to query `up{job="satellite"}` and added Satellite/PCP verification commands from Red Hat's documented workflow.

## Review Notes
The Prometheus scrape example assumes Prometheus can reach the Satellite Server over HTTPS and that the operator adapts the target FQDN to the local deployment. Production environments may also need local TLS and authentication settings in Prometheus, depending on the Satellite configuration.
