# Validation Summary: How to Set Up Prometheus and Grafana on Ubuntu

## Status
validated

## Post Type
Tutorial / step-by-step guide

## Technologies Covered
- Prometheus (v2.48.0)
- Node Exporter (v1.7.0)
- Grafana (OSS, APT repository)
- systemd service management
- PromQL (alerting and recording rules)
- nginx (reverse proxy / basic auth)
- ufw (firewall)
- Ubuntu 22.04 LTS

## Sources Consulted
- Prometheus installation & configuration docs — https://prometheus.io/docs/prometheus/latest/installation/
- Prometheus self-monitoring / own metrics — https://prometheus.io/docs/introduction/first_steps/ and https://training.promlabs.com/training/monitoring-and-debugging-prometheus/metrics-based-meta-monitoring/prometheus-own-metrics/
- Node Exporter releases — https://github.com/prometheus/node_exporter/releases
- Grafana install on Debian/Ubuntu — https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/
- Grafana unified vs legacy alerting (cannot both be enabled; legacy removed in v11) — https://grafana.com/docs/grafana/latest/alerting/ and https://github.com/grafana/grafana-ansible-collection/issues/204
- Grafana provisioning (datasources, dashboards, alerting) — https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
1. **Grafana alerting config would prevent startup.** The `[server]`/`[security]` block appended to `grafana.ini` enabled both legacy and unified alerting:
   ```
   [alerting]
   enabled = true
   [unified_alerting]
   enabled = true
   ```
   Grafana refuses to start when both are enabled ("legacy and unified alerting cannot both be enabled at the same time"), and legacy alerting is removed entirely in Grafana 11+ (where `[alerting].enabled = true` is a hard error). Fixed by setting `[alerting] enabled = false` and keeping `[unified_alerting] enabled = true`, with a corrected explanatory comment.

2. **Non-existent metric in the `PrometheusNotHealthy` alert.** The rule used `expr: prometheus_health != 1`. There is no `prometheus_health` metric exposed by Prometheus, so the alert vector would always be empty and the alert could never fire. Replaced with the standard self-monitoring expression `up{job="prometheus"} == 0` and updated the description to match.

## Review Notes
- The crontab installation step (`echo "..." | sudo tee -a /var/spool/cron/crontabs/root`) is functional but writes directly to the cron spool file. The more conventional/robust approach is `(crontab -l 2>/dev/null; echo "0 2 * * * ...") | crontab -`, which guarantees correct ownership/permissions and a trailing newline. Left as-is since it is not strictly incorrect.
- The Grafana datasource provisioning example references `datasourceUid: tempo` for exemplar trace links. This is a forward reference to a Tempo datasource that isn't created in the guide; it provisions without error but exemplar links won't resolve until a Tempo datasource with that UID exists. Acceptable as an illustrative example.
- Prometheus v2.48.0 and Node Exporter v1.7.0 download URLs are valid. Both are older-but-stable releases; the post correctly tells readers to check the downloads page for the latest version.
- systemd hardening (`ProtectSystem=strict`, `ReadWritePaths`, `NoNewPrivileges`), the node_exporter collector flags (`--collector.systemd`, `--collector.processes`, `--collector.filesystem.mount-points-exclude`), the PromQL expressions in dashboards/recording rules, and the Grafana APT keyring setup were all verified as correct and current.
