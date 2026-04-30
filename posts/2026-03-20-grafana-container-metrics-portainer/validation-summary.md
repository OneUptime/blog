# Validation Summary: How to Create a Container Metrics Dashboard in Grafana via Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Grafana
- Prometheus
- cAdvisor
- PromQL
- Container monitoring

## Sources Consulted
- Grafana documentation, "Configure the Prometheus data source": https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana documentation, "Import dashboards": https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana documentation, "Add variables": https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana documentation, "Prometheus template variables": https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation, "Create and link alert rules to panels": https://grafana.com/docs/grafana/latest/alerting/alerting-rules/link-alert-rules-to-panels/
- Grafana documentation, "Configure Grafana-managed alert rules": https://grafana.com/docs/grafana/latest/alerting/unified-alerting/alerting-rules/create-grafana-managed-rule/
- Grafana documentation, "Template annotations and labels": https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/
- Grafana dashboard library, dashboard ID 14282 "Cadvisor exporter": https://grafana.com/grafana/dashboards/14282-cadvisor-exporter/
- Prometheus documentation, "Monitoring Docker container metrics using cAdvisor": https://prometheus.io/docs/guides/cadvisor/
- Prometheus documentation, "Query functions": https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation, "Querying basics": https://prometheus.io/docs/prometheus/latest/querying/basics/
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
1. The prerequisites contradicted Step 1 by saying the Prometheus data source was already configured. I changed that prerequisite to require Prometheus to be reachable from Grafana instead.
2. The Grafana UI paths for adding the Prometheus data source and importing a dashboard were out of date. I updated them to the current documented menu paths and changed the save/test confirmation text to the current Grafana wording.
3. The variable example used deprecated Prometheus classic query syntax and attempted to filter inside `label_values(...)`. Grafana's current Prometheus variable documentation marks classic queries as deprecated and notes that `label_values` does not support queries, so I replaced it with the current `Label values` query type plus metric, label, and regex fields.
4. The alerting section assumed a dashboard variable could be used directly in an alert rule and used outdated alert-rule wording. I changed it to create the alert from a non-variable panel query, updated the panel-menu path, and corrected the alert templating to use supported `$labels` and `$values.A.Value` fields.
5. The restart query used `increase(container_start_time_seconds[5m])`, but `container_start_time_seconds` is a cAdvisor gauge and Prometheus documents `increase()` for counters only. I replaced it with `changes(container_start_time_seconds[5m])`.
6. The rate-based Grafana panel queries used fixed `[5m]` windows. I updated them to `$__rate_interval`, which current Grafana documentation recommends for Prometheus `rate()` and `increase()` queries.

## Review Notes
- The CPU query is valid for cAdvisor, but it is not host-normalized. Because it is based on `rate(container_cpu_usage_seconds_total) * 100`, a container using more than one CPU core can exceed `100%`.
- The post's use of the cAdvisor `name` label is appropriate for direct cAdvisor scraping in a Docker/Portainer setup, and it matches Prometheus's official cAdvisor guide. In kubelet/cAdvisor setups, label names often differ, so these queries are not automatically portable to Kubernetes environments.
