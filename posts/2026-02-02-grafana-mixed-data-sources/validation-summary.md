# Validation Summary: How to Configure Grafana Mixed Data Source Panels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana (mixed data source feature, panel JSON, field overrides, transformations, annotations, variables, HTTP API)
- Prometheus (PromQL, recording rules, `offset` modifier, `histogram_quantile`)
- InfluxDB 1.x (InfluxQL, continuous queries, `tz()` clause, `$timeFilter`, `$__interval` macros)
- PostgreSQL data source (`rawSql`, `$__timeGroup`, `$__timeFilter` macros)
- Elasticsearch data source
- CloudWatch data source
- Azure Monitor data source (`grafana-azure-monitor-datasource`)
- Google Cloud Monitoring / Stackdriver data source
- Python (`requests`, `pathlib`) for dashboard provisioning via Grafana API
- YAML for Prometheus recording rules

## Sources Consulted
- Grafana mixed data source documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/
- Grafana keyboard shortcuts reference: https://grafana.com/docs/grafana/latest/dashboards/use-dashboards/#keyboard-shortcuts
- Grafana field overrides documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/configure-overrides/
- Grafana transformations reference: https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/
- Grafana HTTP API (`/api/dashboards/db`): https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Prometheus PromQL `offset` operator: https://prometheus.io/docs/prometheus/latest/querying/basics/#offset-modifier
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- InfluxQL `tz()` clause: https://docs.influxdata.com/influxdb/v1/query_language/explore-data/#the-time-zone-clause
- InfluxDB Continuous Queries: https://docs.influxdata.com/influxdb/v1/query_language/continuous_queries/

## Issues Found
- **Keyboard shortcut `e` for "Add panel" was incorrect.** The post originally said "Click the 'Add panel' button or use the keyboard shortcut `e`". In Grafana, `e` is the shortcut to toggle the edit view of a focused/hovered panel — it does not add a new panel. Removed the incorrect shortcut reference and left the "Add panel" button instruction.

## Review Notes
- The `"uid": "-- Mixed --"` literal used for the mixed data source matches Grafana's documented convention; this is the special sentinel UID used when the panel-level datasource is set to mixed mode and each target carries its own concrete `datasource` block.
- The CloudWatch target uses the older `"statistics": ["Average"]` (array) form. Modern Grafana CloudWatch query model prefers `"statistic": "Average"` (singular string), but the older array form is still accepted in most current Grafana versions, so left as-is.
- The Azure Monitor target uses the legacy `metricDefinition`/`resourceGroup` fields. Newer Azure Monitor query models prefer the `resources` array with `resourceUri`, but the legacy fields remain compatible with the bundled Azure Monitor datasource plugin in many versions, so left as-is.
- The Google Cloud Monitoring datasource type `"stackdriver"` is the historical plugin id; Grafana still recognizes this as an alias for the Cloud Monitoring datasource. Left as-is.
- Annotation entries use the legacy `"showIn": 0` form, which is still accepted and means "show in all panels". This has been superseded by `"filter"`/`"hide"` semantics in some newer schema versions but remains backward compatible.
- `CREATE CONTINUOUS QUERY` is InfluxDB 1.x syntax. The post correctly notes that InfluxDB 2.x users should use Tasks instead — accurate for both major InfluxDB lines.
- The Grafana HTTP API endpoint `POST /api/dashboards/db` with `dashboard`, `folderId`, `overwrite`, and `message` payload fields is current and correct; `folderId` has a newer `folderUid` counterpart that callers may prefer in modern Grafana, but `folderId` still functions.
