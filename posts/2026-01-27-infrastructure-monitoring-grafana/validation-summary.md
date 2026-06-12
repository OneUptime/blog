# Validation Summary: How to Configure Infrastructure Monitoring in Grafana

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana dashboards and panels
- Prometheus scrape configuration, PromQL, alerting rules, and recording rules
- Prometheus Node Exporter
- Prometheus Windows Exporter
- Prometheus SNMP Exporter
- AWS CloudWatch data source
- Google Cloud Monitoring data source
- Azure Monitor data source
- systemd service configuration

## Sources Consulted
- Prometheus Node Exporter releases: https://github.com/prometheus/node_exporter/releases
- Prometheus Node Exporter documentation: https://github.com/prometheus/node_exporter
- Prometheus guide to monitoring Linux host metrics with Node Exporter: https://prometheus.io/docs/guides/node-exporter/
- Prometheus Windows Exporter documentation and installation options: https://github.com/prometheus-community/windows_exporter
- Prometheus Windows Exporter releases: https://github.com/prometheus-community/windows_exporter/releases
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus SNMP Exporter documentation: https://github.com/prometheus/snmp_exporter
- Grafana Node Graph panel documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/node-graph/
- Grafana AWS CloudWatch query editor documentation: https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/query-editor/
- Grafana Google Cloud Monitoring query editor documentation: https://grafana.com/docs/grafana/latest/datasources/google-cloud-monitoring/query-editor/
- Grafana Azure Monitor query editor documentation: https://grafana.com/docs/grafana/latest/datasources/azure-monitor/query-editor/
- Microsoft Azure Monitor supported metrics reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/metrics-index

## Issues Found
- The Node Exporter installation command used v1.7.0, which is outdated. Updated the example to v1.11.1, the current release checked during validation.
- The Windows Exporter MSI command used v0.25.1, which is outdated. Updated the example to v0.31.7, the current release checked during validation.
- The Windows Exporter examples included the `cs` collector, which is not listed in the current Windows Exporter collector set. Removed `cs` from both the MSI and direct-run examples.
- The Windows Exporter MSI example did not show the documented installer property syntax for setting enabled collectors in PowerShell. Added `--% ENABLED_COLLECTORS=...`.
- The CPU-by-mode and CPU panel queries used `sum(rate(...))`, which reports CPU-core seconds and can exceed 100% on multi-core hosts. Changed those examples to average CPU modes and multiply by 100 for percent output.
- The per-core CPU utilization query grouped only by `cpu`, which can merge cores with the same CPU label across multiple instances. Updated it to group by `instance` and `cpu`.
- The NFS retransmission query was labeled as latency, but `node_nfs_rpc_retransmissions_total` is a retransmission counter. Updated the label to "NFS retransmissions."
- The Google Cloud Monitoring filter example used `resource.instance_id`, which does not match Grafana's query-builder filter style. Updated it to filter on `instance_id`.

## Review Notes
The remaining dashboard configuration snippets are conceptual Grafana panel notes rather than importable dashboard JSON. Several PromQL examples are intentionally broad and may need additional filesystem, device, or instance filters in large environments, but they are syntactically valid patterns for the monitoring concepts described. `promtool` was not installed in the workspace, so Prometheus rule snippets were reviewed against official syntax documentation rather than executed locally.
