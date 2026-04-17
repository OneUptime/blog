# Validation Summary: How to Set Up ClickHouse Alerts with Prometheus AlertManager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (built-in Prometheus metrics endpoint)
- Prometheus (alerting rules, PromQL, template functions)
- AlertManager (routing, grouping, inhibition, receivers)
- Slack, PagerDuty integrations
- systemd service units
- `amtool` CLI

## Sources Consulted
- AlertManager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus template reference (humanize, humanize1024, humanizePercentage): https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- AlertManager release history (latest v0.32.0, 2026-04-08): https://github.com/prometheus/alertmanager/releases
- Verified AlertManager v0.32.0 linux-amd64 tarball URL via HTTP HEAD request (200 OK)
- ClickHouse system.asynchronous_metrics naming (DiskUsed_<disk>, DiskTotal_<disk>, DiskAvailable_<disk> — there is no `DiskFree_<disk>` metric)
- AlertManager `amtool` subcommands (`alert add`, `silence add`, `config routes test|show`, `check-config`)

## Issues Found

1. **Outdated AlertManager version (v0.27.0).** v0.27.0 was released in Jan 2024 and is two major minor versions behind the latest stable (v0.32.0, released 2026-04-08). Updated the download URL, tarball name, and directory references in the install snippet to `v0.32.0` / `alertmanager-0.32.0.linux-amd64.tar.gz`. Verified the new URL returns HTTP 200.

2. **Wrong template function `humanizePercentage` applied to a QPS rate.** In the `ClickHouseHighQueryCount` alert, the description used `{{ $value | humanizePercentage }}`. `humanizePercentage` converts a 0-1 ratio to a percentage by multiplying by 100 (e.g. `0.75` → `75%`). Applied to a queries-per-second value like `1500`, it would render as `150000%`, which is nonsensical. Replaced with `humanize`, which uses SI prefixes (e.g. `1500` → `1.5k`) and matches the "per second" phrasing that follows.

3. **Misleading byte formatting in memory alert description.** The `ClickHouseHighMemoryUsage` expression divides by `1024^3` to compare in GB, but the description then used `{{ $value | humanize }}B`. `humanize` on a small number like `28` returns `"28"` (no suffix), producing `"28B"`, which reads as 28 bytes. Changed to `{{ $value }} GB` so the unit matches the transformed value.

4. **Non-existent metric `ClickHouseAsyncMetrics_DiskFree_<disk>`.** ClickHouse's async metrics expose `DiskUsed_<disk>`, `DiskTotal_<disk>`, `DiskAvailable_<disk>`, and `DiskUnreserved_<disk>` — there is no `DiskFree_*` metric. Also, the default disk in a stock ClickHouse install is named `default`, not `data`. Rewrote the disk-usage expression to the more idiomatic `DiskUsed_default / DiskTotal_default > 0.85`, which both uses a real metric and matches the default disk name new readers will have.

## Review Notes

- `source_match` / `target_match_re` in `inhibit_rules` still work in current AlertManager versions, but are considered legacy. The newer form is `source_matchers` / `target_matchers` using the `{name=~"..."}` PromQL-style matcher syntax. Left unchanged because the old form is still documented and functional; worth modernizing in a future revision.
- `global.slack_api_url` and `global.pagerduty_url` are valid global fields. Receiver-level `slack_configs` and `pagerduty_configs` fields used (`channel`, `title`, `text`, `color`, `send_resolved`, `routing_key`, `description`, `severity`, `details`) are all current.
- The `amtool` invocations (`alert add`, `alert query`, `silence add`, `silence query`, `check-config`, `config routes test`, `config routes show`) match the current CLI.
- PromQL expressions (`rate(...)`, `up{job="clickhouse"} == 0`, comparisons, division for ratios) are syntactically correct.
- Metric naming convention (`ClickHouseMetrics_*`, `ClickHouseAsyncMetrics_*`, `ClickHouseProfileEvents_*`) matches ClickHouse's built-in Prometheus endpoint — the post assumes that endpoint rather than the Percona-style `clickhouse_exporter`, which uses snake_case metric names. The prerequisites section mentions `clickhouse-exporter` ambiguously; readers using the Percona exporter would need to translate metric names.
- The `ClickHouseHighQueryCount` threshold of 1000 QPS is arbitrary and should be tuned to each deployment — this is implicit in a tutorial but worth flagging.
