# Validation Summary: How to Set Up Grafana for Dashboard Visualization on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Grafana
- Prometheus
- firewalld
- systemd
- Nginx
- YAML provisioning
- JSON dashboard model

## Sources Consulted
- Grafana documentation: Install Grafana on RHEL or Fedora - https://grafana.com/docs/grafana/latest/setup-grafana/installation/redhat-rhel-fedora/
- Grafana documentation: Start the Grafana server - https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/
- Grafana documentation: Configure Grafana - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana documentation: Sign in to Grafana - https://grafana.com/docs/grafana/latest/setup-grafana/sign-in-to-grafana/
- Grafana documentation: Grafana data sources - https://grafana.com/docs/grafana/latest/datasources/
- Grafana documentation: Configure the Prometheus data source - https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana documentation: Provision Grafana - https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana Labs tutorial: Run Grafana behind a reverse proxy - https://grafana.com/tutorials/run-grafana-behind-a-proxy/
- Red Hat documentation: Managing software with the DNF tool - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Red Hat documentation: Configuring firewalls and packet filters - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The Grafana repository setup skipped the official GPG key import command. Added `wget -q -O gpg.key https://rpm.grafana.com/gpg.key` and `sudo rpm --import gpg.key` before creating `/etc/yum.repos.d/grafana.repo`, matching Grafana's RPM installation instructions.
- The `allow_sign_up` setting was shown under `[security]`, but Grafana documents it under `[users]`. Moved `allow_sign_up = false` to a `[users]` section.
- The data source UI navigation used older wording, "Configuration (gear icon) then Data Sources". Updated it to the current Grafana flow using **Connections** and selecting the Prometheus data source.
- The custom dashboard JSON used an API-style top-level `dashboard` wrapper while also saying it could be saved directly to the provisioning directory. Replaced it with a classic dashboard JSON object containing the expected dashboard metadata, panel IDs, `schemaVersion`, and related fields for file provisioning.

## Review Notes
The remaining commands and configuration snippets are consistent with the official Grafana, Prometheus data source provisioning, systemd, DNF, firewalld, and Nginx reverse proxy documentation. The example dashboard assumes Prometheus has node_exporter metrics available and that the Prometheus data source is configured as the default.
