# Validation Summary: How to Query IPv4 Access Logs with Grafana Loki

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana dashboards and panels
- Promtail
- Grafana Alloy
- Nginx access logs

## Sources Consulted
- Grafana Loki storage schema docs: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki query docs: https://grafana.com/docs/loki/latest/query/
- Grafana Loki metric queries docs: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki IP matching docs: https://grafana.com/docs/loki/latest/query/ip/
- Grafana Loki query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Loki Promtail docs: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Promtail installation docs: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Grafana Loki alerting and recording rules docs: https://grafana.com/docs/loki/latest/alert/

## Issues Found
- The Loki filesystem example used schema `v12`, but current Loki docs recommend `v13` for new installs. I updated the schema version.
- The Loki local configuration snippet was incomplete for a current single-binary filesystem-backed setup because it omitted the `common` block used in Grafana’s own complete example. I added `path_prefix`, `replication_factor`, and an in-memory ring configuration, and aligned the storage example with the current filesystem example.
- The Promtail section presented Promtail as a normal current shipper, but Promtail is end of life as of March 2, 2026. I added a short technical note stating that new deployments should use Grafana Alloy or another supported client.
- The Promtail example omitted a `positions` file configuration that current Grafana examples include for file tailing. I added `positions.filename`.
- The LogQL examples incorrectly used `logfmt` against a plain Nginx access log file. Default Nginx access logs are not logfmt, so those queries would not extract `remote_addr`, `status`, or `bytes_sent` as written. I replaced those examples with a `pattern` parser that matches the Nginx access log structure documented by Grafana.
- The exact-IP example used a plain string line filter, which Grafana’s IP matching docs explicitly warn can produce false positives. I replaced it with `ip()` matching.
- The "HTTP 4xx errors per IP" example was not actually returning per-IP counts; it only filtered log lines. I changed it to a metric query that counts 4xx entries grouped by `remote_addr`.
- The Grafana panel queries inherited the same parsing problem as the LogQL examples and would not work reliably against default Nginx access logs. I updated all panel queries to use the same `pattern` parser.
- The Loki alert expression used a brittle raw regex match over the log line. I updated it to parse Nginx fields first and then filter on the extracted `status` value.
- The conclusion recommended `|=` for literal IP searches, which is too imprecise for exact IP matching according to current Loki docs. I updated the guidance to recommend `ip()` and `pattern`/`regexp` parsing as appropriate.

## Review Notes
- The post now reflects Grafana’s current documentation as of April 30, 2026, but its shipper example remains legacy because Promtail is already EOL. A future revision should replace the Promtail example with Grafana Alloy entirely.
- The query examples assume a standard Nginx combined access log format. If the deployment uses a custom JSON log format instead, the queries should switch to `| json` rather than `| pattern`.
- The examples extract `remote_addr` at query time, which avoids indexing high-cardinality IP addresses as stored Loki labels. That is preferable to ingest-time labeling for most access-log use cases.
