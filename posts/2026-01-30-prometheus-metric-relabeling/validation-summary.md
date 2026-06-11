# Validation Summary: How to Create Prometheus Metric Relabeling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (relabel_configs, metric_relabel_configs, write_relabel_configs)
- Prometheus service discovery (Kubernetes SD)
- RE2 regex syntax
- promtool
- YAML configuration
- Python (debugging script example)

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- Prometheus source `model/relabel/relabel.go` (DefaultRelabelConfig, Action constants)
- Prometheus issue #11526 (clarifying that relabel regex is fully anchored)
- Prometheus metrics exposed by the server (`scrape_duration_seconds`, `prometheus_target_sync_length_seconds`, `prometheus_target_scrape_pool_reloads_total`)

## Issues Found

1. **Common Pitfall #1 (Regex Matching Issues) was technically incorrect.**
   The post claimed `regex: 'http_requests_total'` would match `http_requests_total_extra`, requiring `^...$` for an exact match. This is wrong: Prometheus relabel regexes are **fully anchored on both ends by default** (the `NewRegexp` constructor in the source explicitly creates an anchored Regexp). The "wrong" example given would actually have been an exact match.
   - **Fix:** Rewrote the pitfall to explain that regex is implicitly anchored, and demonstrate the real gotcha (a prefix-looking pattern like `http_requests` only matches the exact string and won't match `http_requests_total`). Also retained a note about unescaped dots, which is a genuine RE2 pitfall.

2. **Performance Considerations table referenced the wrong metric.**
   The post said to "Monitor relabel duration" via `prometheus_target_scrape_pool_reloads_total`. That metric is a counter of scrape-pool reloads (config reload events), not a duration metric and not relabel-specific.
   - **Fix:** Updated the guideline to "Monitor scrape duration" using `scrape_duration_seconds` (per-target scrape latency, which includes relabel cost) and `prometheus_target_sync_length_seconds` (target sync duration, which includes target relabeling).

## Review Notes

- Default field values (`separator: ;`, `regex: (.*)`, `replacement: $1`, `action: replace`) are correctly described.
- Both `$1` and `${1}` capture-group syntaxes are valid in Prometheus replacements; the post's use of `${1}` is fine.
- The list of relabeling actions covers the most common ones. Prometheus also supports `lowercase`, `uppercase`, `keepequal`, and `dropequal` (added in Prometheus 2.36+), which the post does not mention. Not an error, just an omission worth noting for a future expansion.
- The "Missing Labels" pitfall correctly relies on the anchored-regex behavior: an empty source matches `regex: ''` because both sides are empty.
- The Python debugging script is a simplified simulation; it correctly demonstrates `keep`/`drop`/`replace` semantics for the limited example given.
- The Kubernetes SD example using `__meta_kubernetes_pod_annotation_prometheus_io_*` is the standard idiom and is correct.
- `promtool check config prometheus.yml` and `--log.level=debug` are valid.
