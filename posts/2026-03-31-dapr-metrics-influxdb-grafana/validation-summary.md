# Validation Summary: How to Send Dapr Metrics to InfluxDB and Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar metrics configuration)
- InfluxDB 2.x (time series database)
- Telegraf (metrics collection agent)
- Grafana (visualization)
- Flux (InfluxDB query language)
- Kubernetes (deployment target)
- Helm (package manager for InfluxDB installation)
- Prometheus (metrics format/endpoint)

## Sources Consulted
- Dapr Configuration spec and annotations documentation (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr metrics documentation (https://docs.dapr.io/operations/observability/metrics/)
- Telegraf Prometheus input plugin documentation (https://github.com/influxdata/telegraf/tree/master/plugins/inputs/prometheus)
- Telegraf measurement filtering documentation (https://github.com/influxdata/telegraf/blob/master/docs/CONFIGURATION.md#measurement-filtering)
- InfluxDB Flux `histogramQuantile()` documentation (https://docs.influxdata.com/flux/v0/stdlib/universe/histogramquantile/)
- InfluxDB Flux `quantile()` documentation (https://docs.influxdata.com/flux/v0/stdlib/universe/quantile/)
- InfluxData Helm charts documentation (https://github.com/influxdata/helm-charts)
- Grafana InfluxDB data source documentation (https://grafana.com/docs/grafana/latest/datasources/influxdb/)

## Issues Found

1. **Telegraf `tags_ignore` option does not exist** — Changed `tags_ignore = ["le"]` to `tagexclude = ["le"]`. Telegraf uses `tagexclude` (a general measurement filtering option available on all input plugins) to exclude tags by key name. `tags_ignore` is not a valid Telegraf configuration option.

2. **`kubernetes_services` pointed to the Kubernetes API server, not a metrics endpoint** — Removed the line `kubernetes_services = ["http://kubernetes.default.svc:443/api/v1/services"]`. The `kubernetes_services` option in Telegraf's Prometheus input expects direct service URLs that expose Prometheus metrics. The Kubernetes API listing endpoint is not a metrics endpoint. Since the block already uses `monitor_kubernetes_pods = true` with a label selector for Dapr-enabled pods, this line was both incorrect and redundant.

3. **P99 latency Flux query used `quantile()` instead of `histogramQuantile()`** — Changed `quantile(q: 0.99, method: "estimate_tdigest")` to `histogramQuantile(quantile: 0.99)` and fixed the grouping from `group(columns: ["app_id", "le"])` to `group(columns: ["app_id"])`. The `quantile()` function computes quantiles from individual data point values, which is incorrect for Prometheus histogram bucket data. The `histogramQuantile()` function is designed to approximate quantiles from cumulative histogram buckets by reading the `le` (less-than-or-equal) column as bucket boundaries. For `histogramQuantile()` to work correctly, `le` must NOT be in the group key — it needs to see all bucket boundaries together within each table to interpolate the quantile.

## Review Notes
- The Dapr Configuration spec uses `metric` (singular) under `spec`, which is correct for current Dapr versions.
- The default Dapr metrics port 9090 is correctly used throughout.
- The InfluxDB 2 Helm chart values (`adminUser.password`, `persistence.enabled`, `persistence.size`) are correct for the `influxdata/influxdb2` chart.
- The Grafana data source API payload correctly specifies `"version": "Flux"` in `jsonData` for InfluxDB 2.x, which is required for Flux query support.
- The `metric_version = 2` setting in Telegraf's Prometheus input is the recommended value for proper handling of Prometheus metric types (histograms, summaries).
- The `tagexclude = ["le"]` on the first static-URL scrape block will strip histogram bucket boundaries from those services. This is acceptable if only counter/gauge metrics are needed from those endpoints, but users should be aware it prevents histogram quantile computation for data from those specific URLs.
- Flux is the query language for InfluxDB 2.x but has been deprecated in InfluxDB 3.x in favor of SQL and InfluxQL. The post is accurate for InfluxDB 2.x deployments.
