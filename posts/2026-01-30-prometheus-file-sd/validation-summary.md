# Validation Summary: How to Create Prometheus File SD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (File-based Service Discovery, scrape config, relabel_configs, alerting rules)
- JSON and YAML target file formats
- Python (requests, pathlib, atomic file writes)
- Bash + AWS CLI (`aws ec2 describe-instances`)
- Go (encoding/json, os.WriteFile, time.Ticker)
- Ansible (template module, Jinja2)
- GitLab CI/CD
- Prometheus HTTP API (`/api/v1/targets`)

## Sources Consulted
- Prometheus Configuration docs — `file_sd_config`, `relabel_config`, scrape config: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API reference (`/api/v1/targets`, `/api/v1/targets/metadata`): https://prometheus.io/docs/prometheus/latest/querying/api/
- PR #8911 — `__scrape_interval__` / `__scrape_timeout__` via relabeling (Prometheus 2.30): https://github.com/prometheus/prometheus/pull/8911
- Prometheus `discovery/file/file.go` source (inotify + refresh_interval behavior, metric names): https://github.com/prometheus/prometheus/blob/main/discovery/file/file.go
- "What's New in Prometheus 2.30" (PromLabs): https://promlabs.com/blog/2021/09/14/whats-new-in-prometheus-2-30/

## Issues Found

1. **Broken relabel example using `__name__`** — The original example used `source_labels: [region, __name__]` to "add a datacenter prefix to job name". At the target relabeling stage (`relabel_configs`), `__name__` is not populated — it only exists during `metric_relabel_configs` after metrics are scraped. The example would produce a `region-` suffix with an empty `__name__`. Replaced with a single-source `region` example that uses `replacement: "${1}-api"` to achieve the documented intent.

2. **Counter alert expression** — The `FileSDNoTargets` alert used `prometheus_sd_file_read_errors_total > 0` directly. Because `prometheus_sd_file_read_errors_total` is a monotonic counter, this expression remains true forever after the first error (until Prometheus restarts), causing perpetual firing. Changed to `rate(prometheus_sd_file_read_errors_total[5m]) > 0` and renamed the alert to `FileSDReadErrors` so the name matches what is actually being measured (read errors, not "no targets").

3. **Incorrect API endpoint description** — The debugging snippet labeled `/api/v1/targets/metadata` as the way to "View File SD discovered targets". That endpoint returns metric metadata (HELP/TYPE/UNIT), not target/SD information. Replaced with `/api/v1/targets` plus a jq projection of `discoveredLabels`, `labels`, and `scrapePool`, which is the correct endpoint for inspecting discovered targets (including their pre- and post-relabel labels).

## Review Notes

- The "How It Works" section and the sequence diagram describe File SD purely as polling driven by `refresh_interval`. In reality, Prometheus also uses inotify on Linux to detect file changes immediately; `refresh_interval` is the polling fallback (relevant on platforms without inotify, on NFS, or when the watcher fails). The post's simplified description isn't wrong, but it understates how quickly changes are normally picked up on Linux.
- `__scrape_interval__` and `__scrape_timeout__` labels are correctly listed as reserved labels — note these were only added in Prometheus 2.30 (PR #8911), so they will not work on older Prometheus versions. The post does not pin a minimum version, which is fine for current users but worth knowing.
- Both `.yml` and `.yaml` extensions are supported by Prometheus File SD, so the example glob `*.yaml` in the basic config is valid.
- The `with_suffix(".tmp")` pattern in the Python examples produces a temp filename in the same directory (e.g., `servers.json` → `servers.tmp`), which keeps the rename atomic on the same filesystem — correct.
- The Bash example uses `python3 << EOF` with `$instances` expanded by the parent shell; the JSON is wrapped in triple quotes, so most well-formed AWS output will parse, though embedded single-quote sequences in tag values could in principle break the heredoc. Acceptable for an illustrative example.
