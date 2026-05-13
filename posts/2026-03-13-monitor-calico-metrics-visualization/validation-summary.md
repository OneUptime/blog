# Validation Summary: How to Monitor Calico Metrics Visualization Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Felix metrics
- Kubernetes
- Grafana HTTP API
- Grafana internal Prometheus metrics
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Bash, curl, and jq

## Sources Consulted
- Grafana HTTP API authentication documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/
- Grafana Folder/Dashboard Search HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/folder_dashboard_search/
- Grafana Dashboard HTTP API: https://grafana.com/docs/grafana/latest/http_api/dashboard/
- Grafana Health API documentation: https://grafana.com/docs/grafana/latest/developers/http_api/other/
- Grafana internal metrics documentation: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-grafana-monitoring/
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus querying basics and staleness documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The stale data detection query used `(time() - max(timestamp(felix_active_local_policies))) > 600`. This can stop returning a vector after Prometheus marks the series stale, so it may not alert for the scrape-failure case described in the post. I changed it to `absent_over_time(felix_active_local_policies[10m])`, which is the Prometheus function intended for alerting when a metric has no samples over a time range.
- The conclusion described the check as "timestamp-based staleness detection." I updated it to "absence-based staleness detection" to match the corrected PromQL.

## Review Notes
- The Grafana `/api/search`, `/api/dashboards/uid/:uid`, and `/api/health` examples are valid legacy HTTP API endpoints. Grafana 13 documentation marks legacy `/api` routes as deprecated in favor of newer `/apis` routes, but says they remain available and operative.
- The `up{job="grafana"}` alert assumes the Prometheus scrape job is named `grafana`. Clusters using a different scrape job label should adjust the selector.
- The `grafana_http_request_duration_seconds_count` alert assumes Grafana internal metrics are enabled and scraped from `/metrics`.
