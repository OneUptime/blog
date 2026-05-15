# Validation Summary: How to Integrate RHEL Storage Metrics with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Prometheus node_exporter
- Prometheus scrape configuration, PromQL, and alerting rules
- Grafana dashboards
- systemd
- firewalld
- DNF and EPEL packaging

## Sources Consulted
- Prometheus node_exporter README: https://github.com/prometheus/node_exporter
- Prometheus node_exporter releases: https://github.com/prometheus/node_exporter/releases
- Prometheus guide, "Monitoring Linux host metrics with the Node Exporter": https://prometheus.io/docs/guides/node-exporter/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus template examples: https://prometheus.io/docs/prometheus/3.3/configuration/template_examples/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana Labs dashboard 1860, Node Exporter Full: https://grafana.com/grafana/dashboards/1860
- Fedora Packages, node-exporter EPEL 9 package: https://packages.fedoraproject.org/pkgs/node-exporter/node-exporter/epel-9.html
- Red Hat Customer Portal RFE for golang-github-prometheus-node-exporter in RHEL 9: https://access.redhat.com/solutions/7012546

## Issues Found
- The original DNF command used `golang-github-prometheus-node-exporter`, which is not the current EPEL 9 package name. Changed it to `node-exporter` and clarified that this applies when EPEL is enabled.
- The manual install pinned node_exporter `v1.7.0`, which is outdated. Updated the GitHub release URL, archive name, and extracted directory to `v1.11.1`, the latest release available during validation.
- The systemd unit instructions followed both package and manual install paths. Clarified that the custom systemd unit is for the manual install path.
- The Prometheus reload command was presented without noting that the HTTP reload endpoint requires Prometheus to run with `--web.enable-lifecycle`. Added that condition.
- The disk utilization PromQL returned a seconds-per-second ratio, not a percentage. Multiplied by `100` so the query matches the "Disk Utilization" heading.

## Review Notes
- The remaining PromQL examples are syntactically valid and use current node_exporter metric names.
- The alerting rules are valid Prometheus rule syntax, but a production setup should also reference the alert file from `rule_files` in `prometheus.yml` and configure Alertmanager routing.
- The filesystem examples exclude `tmpfs`; production dashboards often exclude additional pseudo-filesystems depending on the host environment.
