# Validation Summary: How to Use Ansible to Set Up Monitoring for Web Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Prometheus
- Prometheus Alertmanager
- Prometheus Node Exporter
- Prometheus Blackbox Exporter
- Grafana
- systemd
- YAML and Jinja2 templates

## Sources Consulted
- Ansible Core documentation: Tags, including role-level tag inheritance and `ansible-playbook --tags` behavior: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_tags.html
- Prometheus configuration documentation: scrape configuration, relabeling, and `__param_<name>` behavior: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting tutorial: `evaluation_interval`, `rule_files`, and `alerting` configuration: https://prometheus.io/docs/tutorials/alerting_based_on_metrics/
- Prometheus Blackbox Exporter README: supported probers, `/probe` usage, module query parameter, and `probe_duration_seconds`: https://github.com/prometheus/blackbox_exporter
- Prometheus Blackbox Exporter configuration reference: HTTP prober options including `follow_redirects`, TLS options, and address selection: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Grafana provisioning documentation: datasource provisioning file format and fields such as `apiVersion`, `datasources`, `type`, `access`, `url`, `isDefault`, and `editable`: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The introduction and description overstated the deployment as a complete stack with log aggregation. The snippets do not deploy a log aggregation component and only configure Prometheus alerting rules, so the wording now describes system metrics, health checks, and alerting rules.
- The architecture diagram showed application metrics on port 3000, while the Prometheus scrape configuration used port 8080 and Grafana also commonly uses port 3000. The diagram now uses `:8080/metrics`.
- The architecture diagram implied Prometheus sends data to Grafana. Grafana queries Prometheus, so the diagram now shows Grafana querying Prometheus.
- The project structure omitted `roles/node_exporter/handlers/main.yml` even though the role notifies `Restart node_exporter` and the article later shows the handler. The structure now includes the handler directory.
- The Prometheus section configured Alertmanager at `localhost:9093` but the article did not deploy Alertmanager. The text now states that Alertmanager must already be listening there or be deployed separately.
- The Blackbox scrape configuration ignored each endpoint's `module` value by hardcoding `params: module: [http_2xx]`. The template now attaches a per-target `module` label and relabels it to `__param_module`.
- The `HighResponseTime` rule used `probe_http_duration_seconds`, which is phase-specific for HTTP probes. It now uses `probe_duration_seconds` for total probe duration.
- The `--tags node_exporter` command was documented without any matching tag in the playbook. The `node_exporter` role is now tagged so the command selects that role's tasks.

## Review Notes
The versions shown, such as Prometheus `2.48.0`, Node Exporter `1.7.0`, and Blackbox Exporter `0.24.0`, are older examples but the referenced configuration patterns remain valid. A future improvement would be to include the omitted Prometheus, Grafana, Blackbox Exporter, and Alertmanager installation tasks if the article is intended to be a fully copy-paste deployable stack.
