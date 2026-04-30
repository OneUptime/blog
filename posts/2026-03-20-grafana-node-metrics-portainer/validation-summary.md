# Validation Summary: How to Create a Node Metrics Dashboard in Grafana via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana
- Prometheus
- PromQL
- Prometheus alerting rules
- Prometheus Node Exporter
- Portainer

## Sources Consulted
- Grafana documentation, "Import dashboards": https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana documentation, "Prometheus template variables": https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation, "Add variables": https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana documentation, "Prometheus query editor": https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana dashboard page, "Node Exporter Full" (ID 1860): https://grafana.com/grafana/dashboards/1860
- Prometheus documentation, "Query functions": https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation, "Operators": https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation, "Alerting rules": https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus `node_exporter` repository README: https://github.com/prometheus/node_exporter

## Issues Found
- The Grafana import path was outdated. The post said `Dashboards → Import`, but current Grafana documentation uses `Dashboards → New → Import dashboard`. I updated the step to match the current UI.
- The post said dashboard `1860` worked "out of the box" and implied it covered all Node Exporter metrics without qualification. The current Grafana dashboard page documents that it expects the default Prometheus `job_name: node` and recommends the optional `--collector.systemd` and `--collector.processes` collectors for some panels. I corrected the text to reflect those requirements.
- The multi-server variable setup used Grafana's deprecated Prometheus "classic query" syntax: `label_values(node_cpu_seconds_total, instance)`. Grafana's current documentation marks classic query strings as deprecated, so I replaced that guidance with the current `Query` + `Label values` configuration flow.
- The post instructed readers to update queries with `{instance="$instance"}` while also turning on `Multi-value`. For Prometheus variables, Grafana formats multi-value selections as regex-compatible strings, so the selector must use `=~` rather than `=`. I corrected the guidance to `instance=~"$instance"` and clarified that it must be added inside existing label selectors.
- The conclusion claimed the setup provided visibility "from bare-metal CPU registers" onward. Node Exporter exposes host and OS metrics, not CPU register-level telemetry. I rewrote that phrase to accurately describe host CPU, memory, disk, and network metrics.

## Review Notes
- The PromQL panel examples and alert rule structure are consistent with current Prometheus syntax and current Node Exporter metric names.
- Dashboard `1860` is a community dashboard hosted on Grafana's dashboard catalog, so panel coverage and revision-specific behavior can change over time even when the dashboard ID remains stable.
- No local `promtool` binary was available in the workspace, so alert-rule validation was documentation-based rather than executed with `promtool check rules`.
