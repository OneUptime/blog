# Validation Summary: How to Configure Grafana with Prometheus Data Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- Prometheus
- PromQL
- Kubernetes ConfigMaps, Secrets, and Deployments
- Grafana provisioning for data sources and dashboards

## Sources Consulted
- Grafana Prometheus data source configuration: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana Prometheus query editor and incremental querying: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana provisioning documentation for data sources and dashboards: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana visualizations documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Grafana data source management and query/resource caching: https://grafana.com/docs/grafana/latest/administration/data-source-management/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap volume documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/

## Issues Found
- The Kubernetes `apps/v1` Deployment snippets were missing the required `.spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` in each Deployment snippet so the manifests are valid for `apps/v1`.
- The Prometheus data source interval snippet used `minInterval` under `jsonData`, but Grafana provisioning documents `timeInterval` as the data-source lowest interval/scrape interval setting. Removed `minInterval` and updated the best-practice text to refer to `timeInterval`.
- The query performance section described `cacheLevel` as response caching. Grafana documents it as browser caching for editor queries, while incremental querying is separate. Updated the wording and best-practice item to describe caching-related settings more accurately.
- The optimization snippet said metrics lookup was disabled but set `disableMetricsLookup: false`. Changed it to `true` to match the comment and Grafana's documented behavior.
- Dashboard examples used the legacy `graph` panel type. Grafana documentation identifies `timeseries` as the current default and main graph visualization, so the examples were changed to `timeseries`.
- The exemplar section said to configure Prometheus to provide exemplars, but the YAML shown configures Grafana's Prometheus data source exemplar links. Updated the sentence to describe the Grafana data-source configuration accurately.
- The CPU recording rule averaged all non-idle CPU mode rates, which undercounts utilization because it averages across multiple non-idle modes. Replaced it with `1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m]))`.

## Review Notes
- The snippets assume existing Kubernetes services named `prometheus`, `prometheus-us-east`, `prometheus-us-west`, and `prometheus-eu`, and label selectors such as `app=grafana` / `app=prometheus` for debugging commands.
- Grafana `cacheLevel`, `incrementalQuerying`, `queryTimeout`, `customQueryParameters`, TLS settings, basic auth provisioning, and exemplar link fields are valid Prometheus data-source settings in current Grafana documentation.
- Prometheus `timeout` custom query parameters and POST requests are supported by the Prometheus HTTP API.
