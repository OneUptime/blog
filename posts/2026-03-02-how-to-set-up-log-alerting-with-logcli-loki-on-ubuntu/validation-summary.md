# Validation Summary: How to Set Up Log Alerting with LogCLI (Loki) on Ubuntu

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Grafana Loki (log aggregation)
- LogCLI (Loki command-line client)
- LogQL (Loki query language)
- Promtail (log shipper)
- Alertmanager (alert routing)
- Docker Compose
- systemd
- Ubuntu 20.04 / 22.04

## Sources Consulted
- Grafana Loki LogCLI documentation: https://grafana.com/docs/loki/latest/query/logcli/
- Loki HTTP API / Ruler reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Loki alerting documentation: https://grafana.com/docs/loki/latest/alert/
- logcli source (cmd/logcli/main.go) for the canonical list of subcommands
- Grafana Loki GitHub releases (asset naming + version tag format)
- Prometheus Alertmanager configuration reference for pagerduty_configs / slack_configs / route fields

## Issues Found
1. **Non-existent `logcli rules` and `logcli alerts` subcommands.** The "Querying Active Alerts via LogCLI" section invoked `logcli rules`, `logcli rules --namespace=fake`, and `logcli alerts`. The logcli binary has no such subcommands — its actual subcommands are `query`, `instant-query`, `labels`, `series`, `fmt`, `stats`, `volume`, `volume_range`, `detected-fields`, and `delete`. Rule and alert state is exposed by the Loki ruler over HTTP. Rewrote the section (renamed to "Querying Active Alerts via the Loki Ruler API") to use `curl` against the documented endpoints: `GET /loki/api/v1/rules`, `GET /loki/api/v1/rules/{namespace}`, `GET /prometheus/api/v1/rules`, and `GET /prometheus/api/v1/alerts`.
2. **`logcli alerts` reused in the testing section.** Replaced with `curl http://localhost:3100/prometheus/api/v1/alerts` and adjusted the comment to match the Prometheus-style "firing" state value.
3. **`logcli rules` reused in the troubleshooting section** to "verify rule syntax". Replaced with `curl http://localhost:3100/prometheus/api/v1/rules` which actually shows currently loaded rules and their evaluation state.
4. **Broken Promtail version detection.** The Promtail install step ran `logcli --version 2>&1 | awk '{print $3}'`, which yields a bare version like `2.9.0` (the prometheus/common version printer does not include a `v` prefix), but the GitHub release URL requires the tag form `v2.9.0`. This would 404. Switched to the same `curl … releases/latest | grep tag_name` approach already used in the LogCLI install section, which returns the correctly-prefixed tag. Also added `sudo chmod +x /usr/local/bin/promtail` for symmetry with the LogCLI install since the extracted zip entry is not guaranteed to carry the executable bit.

## Review Notes
- The Loki config uses `boltdb-shipper` + schema `v11`. This still works on current Loki versions, but `tsdb` + schema `v13` is the recommended choice for new deployments. Left as-is since it is functional and the post is meant as an introductory setup.
- The Alertmanager PagerDuty receiver uses `service_key`, which is the Events API v1 field. `routing_key` (Events API v2) is the more modern option but `service_key` is still supported, so no change made.
- The naming `logcli.gz` / `promtail.gz` for files that are actually `.zip` archives is misleading, but `unzip` keys off magic bytes rather than the extension so the commands work. Left as-is to minimize churn.
- The `LOKI_VERSION` curl-from-GitHub approach is unauthenticated and will hit GitHub's anonymous rate limit (60/hour/IP) on shared NAT. Fine for a tutorial.
