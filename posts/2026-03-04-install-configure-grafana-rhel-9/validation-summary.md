# Validation Summary: How to Install and Configure Grafana on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Grafana
- Performance Co-Pilot (PCP)
- sysstat
- Net-SNMP
- Prometheus
- firewalld
- systemd

## Sources Consulted
- Grafana documentation: Install Grafana on RHEL or Fedora - https://grafana.com/docs/grafana/latest/setup-grafana/installation/redhat-rhel-fedora/
- Grafana documentation: Start the Grafana server - https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/
- Red Hat Enterprise Linux 9 documentation: Setting up PCP - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-up-pcp_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Managing system services with systemctl - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- firewalld documentation: firewall-cmd manual page - https://firewalld.org/documentation/man-pages/firewall-cmd
- Prometheus documentation: HTTP API - https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The post title and description promised Grafana installation, but the install step only installed PCP, sysstat, and Net-SNMP packages. Added the official Grafana RPM repository setup and `sudo dnf install -y grafana` command from Grafana's RHEL/Fedora installation documentation.
- The service step did not start or enable Grafana. Added `sudo systemctl enable --now grafana-server`, matching Grafana's documented systemd service name.
- The verification step checked PCP, sysstat, and Prometheus, but not Grafana. Added a simple `curl -I http://localhost:3000/` check for Grafana's default HTTP port.

## Review Notes
The firewall commands use valid `firewall-cmd` syntax, and port `3000/tcp` matches Grafana's default port. The Prometheus and Node Exporter ports are only relevant if those components are installed and used in the reader's monitoring stack.
