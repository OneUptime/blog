# Validation Summary: How to Monitor HTTP Response Times with curl and Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- curl (write-out / `-w` format)
- Bash scripting (grep PCRE `-oP`)
- Prometheus text exposition format
- node_exporter textfile collector
- Prometheus blackbox_exporter
- Prometheus scrape configuration and `relabel_configs`
- PromQL

## Sources Consulted
- curl manual page, write-out variables: https://curl.se/docs/manpage.html
- Prometheus exposition format: https://prometheus.io/docs/instrumenting/exposition_formats/
- node_exporter textfile collector: https://github.com/prometheus/node_exporter#textfile-collector
- Prometheus blackbox_exporter README and CONFIGURATION.md: https://github.com/prometheus/blackbox_exporter and https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus blackbox_exporter example.yml (relabel pattern)
- PromQL functions reference (`histogram_quantile`, `quantile_over_time`, `avg_over_time`, `rate`): https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
1. The PromQL example for the 95th percentile used `histogram_quantile(0.95, rate(probe_duration_seconds_bucket[5m]))`. The blackbox_exporter exposes `probe_duration_seconds` as a **gauge**, not a histogram, so no `probe_duration_seconds_bucket` series exists and the query would never return data. Replaced it with `quantile_over_time(0.95, probe_duration_seconds[5m])`, which correctly computes a quantile over a gauge. Added a short inline note explaining why.

## Review Notes
- The curl write-out variable names (`time_namelookup`, `time_connect`, `time_appconnect`, `time_pretransfer`, `time_redirect`, `time_starttransfer`, `time_total`, `http_code`) and the `-w "@filename"` syntax for loading the format from a file are all correct per the curl manual.
- The shell exporter writes the textfile-collector `.prom` file directly. The node_exporter textfile collector recommends writing to a temporary file and atomically renaming with `mv` so a partial write is never scraped. This is a reliability improvement, not a correctness bug, so it was left as-is.
- The blackbox_exporter `blackbox.yml` schema (`modules.<name>.prober/timeout/http.{valid_http_versions,valid_status_codes,method,tls_config.insecure_skip_verify}`) and the `prometheus.yml` `relabel_configs` pattern (rewriting `__address__` to `localhost:9115` and forwarding the original target via `__param_target`) match the upstream blackbox_exporter examples.
- `probe_http_duration_seconds{phase="processing"}` is a real series exposed by blackbox_exporter (phases include `resolve`, `connect`, `tls`, `processing`, `transfer`), so that alert example is correct.
- `grep -oP` relies on PCRE support, which is available in GNU grep but not in BSD/macOS grep without alternatives. Acceptable since the script targets Linux (textfile collector path is Linux-specific).
