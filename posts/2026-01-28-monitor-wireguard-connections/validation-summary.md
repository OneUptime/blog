# Validation Summary: How to Monitor WireGuard Connections

## Status
validated

## Post Type
Technical tutorial / monitoring guide

## Technologies Covered
- WireGuard and the `wg` CLI
- Prometheus and PromQL alerting rules
- MindFlavor Prometheus WireGuard Exporter
- Grafana dashboards
- Python `prometheus_client`
- Flask
- Linux dynamic debug and `dmesg`
- Filebeat journald and file inputs
- systemd services

## Sources Consulted
- WireGuard `wg(8)` manual page: https://man7.org/linux/man-pages/man8/wg.8.html
- MindFlavor `prometheus_wireguard_exporter` README: https://github.com/MindFlavor/prometheus_wireguard_exporter
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/
- Flask 3.1 documentation: https://flask.palletsprojects.com/en/stable/
- Elastic Filebeat journald input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-journald
- Elastic Filebeat log input deprecation notice: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-log
- Elastic Filebeat filestream input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream

## Issues Found
- The handshake guidance said active peers should have a latest handshake within the keepalive interval. WireGuard handshakes are not expected to refresh exactly on the persistent keepalive interval, so this was changed to "usually within a few minutes."
- The Bash monitoring script parsed human-readable `wg show` output and warned on any "minute", "hour", or "day" value while leaving the 300-second threshold unused. It now parses the documented tab-delimited `wg show "$INTERFACE" dump` output and compares the latest-handshake epoch against `ALERT_THRESHOLD`.
- The exporter install command used a GitHub "latest/download" binary URL, but the exporter README states pre-built binaries are not provided there. The install steps now build the exporter from source with `cargo install --path .` and copy the installed binary into `/usr/local/bin` for systemd.
- The Prometheus scrape configuration used `relabel_configs` to read the scraped `allowed_ips` metric label. This was changed to `metric_relabel_configs`, which is the correct phase for labels present on scraped samples.
- The Grafana dashboard used the legacy `graph` panel type. It now uses the current `timeseries` panel type.
- The `WireGuardNoPeers` alert counted configured peer metrics rather than active peers, and referenced an unavailable `interface` label after aggregation. It now alerts when the active-handshake count is zero and uses a label-free summary.
- The custom Python exporter parsed `wg show all dump` using the field count for `wg show wg0 dump`, so it would not process the documented `all` output correctly. It now queries `wg show wg0 dump` consistently, skips the interface row, checks subprocess failures, and uses the correct peer field layout.
- The custom Python exporter defined byte counters but never updated them, and `Counter` is not appropriate for directly setting sampled byte totals. The byte metrics now use Gauges and are updated with the parsed byte values.
- The Filebeat journald input used `include_matches` instead of the documented `include_matches.match` key. This was corrected.
- The Filebeat file input used the deprecated `log` input, which Elastic documents as deprecated since 7.16 and disabled in 9.0. It now uses `filestream` with a stable input ID.

## Review Notes
- The Grafana dashboard JSON is still a compact illustrative dashboard fragment rather than a complete exported Grafana dashboard with datasource UIDs, grid positions, schema version, and field configuration.
- The health check endpoint verifies that `wg show wg0` succeeds; it does not prove that any peer is currently reachable.
