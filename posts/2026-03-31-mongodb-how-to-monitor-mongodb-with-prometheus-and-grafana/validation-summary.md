# Validation Summary: How to Monitor MongoDB with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Prometheus
- Grafana
- Percona mongodb_exporter (v0.40)
- Docker
- Kubernetes (ServiceMonitor, PrometheusRule CRD)
- WiredTiger storage engine

## Sources Consulted
- Percona mongodb_exporter GitHub repository (percona/mongodb_exporter) — v0.40.0 source code and README for flag names, metric names, and compatible-mode behavior
- Percona mongodb_exporter v1_compatibility.go source — for compatible-mode metric name mappings
- Prometheus documentation — scrape configuration, alerting rules format, relabel_configs
- Grafana HTTP API documentation — dashboard import endpoint (`POST /api/dashboards/import`)
- Kubernetes Prometheus Operator documentation — PrometheusRule CRD and ServiceMonitor specs

## Issues Found

1. **Fabricated memory metric names** (Step 3): `mongodb_mem_resident_mb` and `mongodb_mem_virtual_mb` are not real metric names from any version of the mongodb_exporter. With `--compatible-mode`, the correct names are `mongodb_memory{type="resident"}` and `mongodb_memory{type="virtual"}`. Fixed to use the correct compatible-mode metric names.

2. **Non-functional Grafana import API call** (Step 4): The curl example sent `"dashboard": {"id": null}` with no actual dashboard content and no `gnetId` reference. This would not import dashboard 2583 or any other dashboard. Fixed to first fetch the dashboard JSON from Grafana.com (`https://grafana.com/api/dashboards/2583/revisions/latest/download`) and then pass it to the import endpoint.

3. **Invalid `kubectl apply` on Prometheus rules file** (Step 6): The alerting rules YAML is a standard Prometheus rules file (with `groups:` at the top level) — it has no `apiVersion`, `kind`, or `metadata` fields, so `kubectl apply` would reject it. Fixed to show the correct approach: copy to Prometheus rules directory and reload, or wrap in a `PrometheusRule` CRD for Kubernetes with Prometheus Operator.

4. **Incorrect cache hit ratio alert formula** (Step 6): The `MongoDBLowCacheHitRatio` alert divided `pages_read_into_cache` (which are cache misses — pages fetched from disk) by `(pages_read_into_cache + unmodified_pages_evicted)`. This does not compute a cache hit ratio — it computes the proportion of cache misses relative to misses plus evictions, which is not a meaningful metric. Additionally, `mongodb_wiredtiger_cache_unmodified_pages_evicted_total` is not a real metric name from the Percona exporter. Replaced with a `MongoDBWiredTigerCacheUsageHigh` alert that monitors cache utilization percentage (bytes in cache / max bytes configured > 95%), which is a standard and actionable WiredTiger monitoring metric.

## Review Notes
- The `--mongodb.uri` flag used in the direct binary run example is confirmed to still be supported in Percona mongodb_exporter v0.40.0 (alongside the `MONGODB_URI` environment variable), so this is correct.
- The Prometheus `relabel_configs` replacement field uses `${1}` syntax, which is valid (both `$1` and `${1}` are accepted).
- The replication lag metrics (`mongodb_rs_members_optimeDate`) and their label names (`state="PRIMARY"/"SECONDARY"`) are plausible but may vary depending on exact exporter version and MongoDB replica set configuration. These were left as-is since they are reasonable for the described setup.
- The Grafana dashboard IDs 2583 and 7353 are well-known community dashboards for MongoDB monitoring, though their compatibility with specific exporter versions may vary.
- The `curl -X POST http://localhost:9090/-/reload` command for reloading Prometheus requires the `--web.enable-lifecycle` flag to be set on the Prometheus server. The post does not mention this prerequisite.
