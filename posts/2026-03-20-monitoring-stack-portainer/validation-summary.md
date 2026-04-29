# Validation Summary: How to Self-Host a Monitoring Stack with Portainer

## Status
validated

## Post Type
Tutorial / Guide (step-by-step deployment walkthrough)

## Technologies Covered
- Portainer (container management)
- Docker / Docker Compose (v3.8 schema)
- Prometheus (metrics collection, TSDB, alerting rules)
- Alertmanager (alert routing, email/Slack/PagerDuty receivers)
- Grafana (dashboards, provisioning, SMTP)
- Node Exporter (host-level metrics)
- cAdvisor (container metrics)
- Traefik (reverse proxy labels for Grafana)

## Sources Consulted
- Prometheus configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus management API: https://prometheus.io/docs/prometheus/latest/management_api/
- Alertmanager configuration docs: https://prometheus.io/docs/alerting/latest/configuration/
- node_exporter README and CHANGELOG (flag rename in v1.3.0): https://github.com/prometheus/node_exporter
- cAdvisor metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana.com dashboard registry: https://grafana.com/grafana/dashboards/

## Issues Found

1. **Alertmanager config referenced an undefined `pagerduty` receiver.** The `route.routes` block routed `severity: critical` alerts to `receiver: 'pagerduty'`, but only `email-alerts` and `slack-alerts` were defined under `receivers:`. Alertmanager rejects configs with undefined receiver references and refuses to start. **Fix:** added a `pagerduty` receiver definition with a placeholder `service_key` so the example is internally consistent and validates with `amtool check-config`.

2. **`ContainerRestarting` alert used an incorrect expression.** The rule was `rate(container_last_seen{name!=""}[15m]) > 1`. `container_last_seen` is a Gauge containing a Unix timestamp that updates every scrape, so its `rate()` is approximately 1 by construction — it does not signal restarts. **Fix:** replaced with `changes(container_start_time_seconds{name!=""}[15m]) > 0`, the canonical pattern for detecting container restarts via cAdvisor metrics.

3. **Grafana dashboard ID 14282 is not "Portainer Metrics".** That ID on grafana.com does not correspond to a Portainer dashboard. **Fix:** removed the bogus entry from the dashboard ID list. The remaining IDs (1860, 893, 11600) were verified as accurate.

## Review Notes

- `version: "3.8"` at the top of the Compose file is obsolete in Docker Compose v2 (it is ignored with a deprecation warning) but still parses fine. Left as-is — not technically wrong, just dated.
- All examples use `:latest` image tags, which is a known reproducibility footgun for production deployments. Out of scope for a "technical correctness" fix; left as-is.
- The `LowDiskSpace` alert does not filter by `fstype` or `mountpoint`, so it can fire on `tmpfs`, `overlay`, etc. Functionally correct PromQL — left as-is, but worth tightening in production with something like `{fstype!~"tmpfs|overlay|squashfs"}`.
- Node exporter flag `--collector.filesystem.mount-points-exclude` is the current name (renamed from the deprecated `--collector.filesystem.ignored-mount-points` in node_exporter v1.3.0) — verified correct.
- Prometheus `--web.enable-lifecycle` is still the current flag name in Prometheus 2.x and 3.x — verified correct.
- The `$$` escape in the node_exporter regex (`^/(sys|proc|dev|host|etc)($$|/)`) is the correct way to pass a literal `$` through Docker Compose interpolation.
