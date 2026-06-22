# Validation Summary: How to Monitor Elasticsearch with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- Prometheus
- Prometheus Elasticsearch Exporter
- Grafana
- Alertmanager
- Docker
- Kubernetes
- Helm
- PromQL
- YAML and JSON configuration

## Sources Consulted
- Prometheus Community Elasticsearch Exporter README: https://github.com/prometheus-community/elasticsearch_exporter
- Prometheus Community Elasticsearch Exporter metrics list: https://raw.githubusercontent.com/prometheus-community/elasticsearch_exporter/master/metrics.md
- Prometheus Community Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-elasticsearch-exporter/values.yaml
- Prometheus Community Helm chart deployment template: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/prometheus-elasticsearch-exporter/templates/deployment.yaml
- Grafana alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/

## Issues Found
- The Docker exporter command used deprecated collector flags `--es.snapshots` and `--es.cluster_settings`. Updated them to `--collector.snapshots` and `--collector.clustersettings`, matching current exporter documentation.
- The cluster health description implied the metric itself maps colors to numeric values 0/1/2. The exporter exposes one series per `color`, with the active color set to 1 and inactive colors set to 0. Updated the explanation.
- The Grafana cluster status query added vectors with different `color` labels, which would return no result in PromQL. Updated it to aggregate the yellow and red status series before calculating the 0/1/2 status value.
- The search latency examples used an incorrect metric name in the recording rule and used cumulative totals directly in the key metrics section. Updated both examples to divide the rate of `elasticsearch_indices_search_query_time_seconds` by the rate of `elasticsearch_indices_search_query_total`.
- The Prometheus alerting rules included `elasticsearch_index_health_status`, which is not exposed by the Prometheus Community Elasticsearch Exporter. Removed that invalid alert.
- The Grafana alert provisioning example omitted required query fields such as `datasourceUid` and `relativeTimeRange`. Expanded the example to follow Grafana's provisioned alert rule structure with a Prometheus query, reduce expression, and threshold condition.

## Review Notes
- The Helm chart currently exposes the exporter on chart service port 9108 by default, while the manual Docker and Kubernetes examples use the exporter binary default port 9114. The snippets are valid in their respective contexts, but users should keep the scrape target aligned with the deployment method they choose.
- `promtool` and `yq` were not installed in the review environment, so Prometheus rule validation was performed by documentation review and syntax-level YAML parsing rather than `promtool check rules`.
