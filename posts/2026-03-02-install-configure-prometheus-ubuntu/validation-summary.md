# Validation Summary: How to Install and Configure Prometheus on Ubuntu

## Status
validated

## Post Type
Tutorial / step-by-step installation and configuration guide

## Technologies Covered
- Prometheus (v2.49.1) — time-series monitoring system
- Node Exporter (v1.7.0) — host metrics exporter
- PromQL — Prometheus query language
- systemd unit files
- nginx as a TLS-terminating reverse proxy with HTTP basic auth
- Ubuntu (apt, useradd, htpasswd)

## Sources Consulted
- Prometheus official docs — https://prometheus.io/docs/prometheus/latest/
- Prometheus configuration reference — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags — https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus management API (`/-/reload`) — https://prometheus.io/docs/prometheus/latest/management_api/
- Prometheus alerting rules — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus GitHub releases — https://github.com/prometheus/prometheus/releases (v2.49.1 confirmed, Jan 2024)
- Node Exporter GitHub releases — https://github.com/prometheus/node_exporter/releases (v1.7.0 confirmed, Nov 2023)
- Node Exporter docs / collector list — https://github.com/prometheus/node_exporter
- systemd.service(5) — for `ExecReload`, `Restart`, `Type=simple` semantics
- nginx ssl_module and ngx_http_auth_basic_module docs

## Issues Found
1. **Missing `ExecReload` directive in the prometheus.service unit.** The "Configuring Alerting Rules" section instructs the reader to run `sudo systemctl reload prometheus`, but the systemd unit as defined had no `ExecReload=` line. systemd would reject the reload with "Job type reload is not applicable for unit prometheus.service." Added `ExecReload=/bin/kill -HUP $MAINPID` to the unit file, which matches Prometheus's documented SIGHUP reload behavior and makes `systemctl reload prometheus` work as the post claims. The `curl -X POST .../-/reload` alternative continues to work as before because `--web.enable-lifecycle` is set.

## Review Notes
- Versions pinned in the post (Prometheus 2.49.1, Node Exporter 1.7.0) are valid releases but no longer the latest. Prometheus has since moved to a 3.x line and Node Exporter to 1.8/1.9. The download URLs and flag semantics shown still work; readers following the "check releases page" note will pick up newer versions naturally.
- `sudo systemctl edit prometheus --force` works because `--force` will create the override drop-in directory if needed; not strictly necessary here since the unit already exists, but harmless.
- `sudo chown prometheus:prometheus /usr/local/bin/prometheus /usr/local/bin/promtool` is not required for the service to run (binaries don't need to be owned by the running user), but is harmless.
- The nginx reverse proxy snippet uses placeholder cert paths (`/etc/ssl/certs/prometheus.crt` and `/etc/ssl/private/prometheus.key`) and assumes the reader will supply real certs; this is reasonable for a guide.
- The `myapp` scrape job at `localhost:8080` is illustrative; readers will obviously substitute their own target.
- No authentication / TLS is configured between Prometheus and Node Exporter; that's standard for the default setup and out of scope for this introductory guide, but worth mentioning in a future hardening section.
