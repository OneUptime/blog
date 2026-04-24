# Validation Summary: How to Configure Prometheus static_configs with IPv4 Targets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus configuration (`prometheus.yml`)
- `static_configs`
- `promtool`
- Prometheus Management API
- Prometheus HTTP API
- YAML

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus management API reference: https://prometheus.io/docs/prometheus/latest/management_api/
- Prometheus command-line flags reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Promtool command-line reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The section titled `Per-Target Labels Using Relabeling` was technically inaccurate. The example does not use `relabel_configs`; it assigns labels by placing each target in its own `static_configs` entry. I updated the heading and inline comment to match Prometheus behavior.
- The reload example implied that `POST /-/reload` works by default and recommended `systemctl reload prometheus` as a generic Prometheus command. Upstream Prometheus documentation states that `/-/reload` is disabled by default unless Prometheus is started with `--web.enable-lifecycle`, and that sending `SIGHUP` is the documented alternative. I updated the commands accordingly.

## Review Notes
- The remaining `static_configs` examples are consistent with current Prometheus configuration syntax and semantics.
- The `/api/v1/targets` verification example matches the current Prometheus HTTP API response structure, including `data.activeTargets`.
- No deprecated configuration fields or commands were identified in the corrected post.
