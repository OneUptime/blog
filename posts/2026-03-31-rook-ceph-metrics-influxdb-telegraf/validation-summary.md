# Validation Summary: How to Set Up Ceph Metrics in InfluxDB/Telegraf

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage)
- Telegraf (metrics collection agent)
- InfluxDB v2 (time-series database)
- Flux (InfluxDB query language)
- Grafana (mentioned in overview)
- Slack (alerting integration)

## Sources Consulted
- Telegraf Ceph input plugin documentation: https://github.com/influxdata/telegraf/tree/master/plugins/inputs/ceph
- Telegraf Prometheus input plugin documentation: https://github.com/influxdata/telegraf/tree/master/plugins/inputs/prometheus
- Telegraf InfluxDB v2 output plugin documentation: https://github.com/influxdata/telegraf/tree/master/plugins/outputs/influxdb_v2
- Telegraf metric filtering documentation (namepass, tagpass): https://github.com/influxdata/telegraf/blob/master/docs/CONFIGURATION.md#metric-filtering
- Flux slack package documentation: https://docs.influxdata.com/flux/v0/stdlib/slack/
- Flux string interpolation documentation: https://docs.influxdata.com/flux/v0/spec/string-interpolation/
- Rook Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/

## Issues Found

1. **Step 3 - Incorrect metric name filtering in Prometheus input**: The original config used `[inputs.prometheus.tagpass]` with `__name__ = ["ceph_*"]` to filter Ceph metrics. This is incorrect because when Telegraf scrapes Prometheus endpoints, the Prometheus metric name becomes the Telegraf measurement name, not a tag. The `__name__` label does not exist as a tag in Telegraf's data model. Fixed by replacing with `namepass = ["ceph_*"]`, which is Telegraf's built-in mechanism for filtering by measurement name. Also removed the unused `name_prefix = ""` option which was set to its default value.

2. **Step 4 - Misleading comment on tagpass filter**: The comment said "Batch up metrics before sending" but the config below was a `tagpass` filter (which filters metrics by tag values), not a batching configuration. Batching would use `metric_batch_size` and `metric_buffer_limit`. Fixed the comment to accurately describe the filter: "Only send metrics that have a cluster tag".

3. **Step 6 - Invalid Flux import**: The code imported `"influxdata/influxdb/alerts"` which is not a valid Flux standard library package. The import was unused in the code and would cause a compilation error. Removed the invalid import.

4. **Step 6 - Incorrect use of slack.message() as pipe destination**: `slack.message()` is a standalone function that returns an HTTP status code, not a pipe-forwardable function. The original code piped data directly into `slack.message()` which would fail. Fixed by wrapping the call in `map()` so it executes per-row, assigning the result to an `_sent` column.

5. **Step 6 - Incorrect Flux string interpolation**: The original text parameter used `${r._value}` but Flux string interpolation requires explicit type conversion for non-string values. Fixed to `${string(v: r._value)}`. Also moved the `filter(fn: (r) => r._value > 0)` before the map to keep the logic cleaner.

## Review Notes
- The Telegraf version (1.29.0) in the install step is valid but will become outdated. Readers should check for the latest version.
- The Flux query language used in Steps 5 and 6 is specific to InfluxDB 2.x. InfluxDB 3.x has moved to SQL and InfluxQL, deprecating Flux. This should be noted if the post is updated in the future.
- The Ceph admin socket path `/var/run/ceph/` is correct for traditional Ceph deployments but may differ in containerized environments.
- The Rook Ceph MGR metrics endpoint (port 9283) is correct for the default Ceph MGR Prometheus module configuration.
