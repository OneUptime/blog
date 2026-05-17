# Validation Summary: How to Set Up Uptime Monitoring for Services on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash shell scripting (HTTP and TCP uptime checks)
- curl, mailutils, cron
- Bash `/dev/tcp` pseudo-device for TCP probes
- Uptime Kuma (Node.js self-hosted monitor)
- systemd service units
- Prometheus Blackbox Exporter (v0.24.0)
- Prometheus scrape configuration and alert rules (PromQL)
- OneUptime (referenced)

## Sources Consulted
- Uptime Kuma repo and wiki — https://github.com/louislam/uptime-kuma and https://github.com/louislam/uptime-kuma/wiki (API Documentation, Environment Variables pages)
- `lucasheld/uptime-kuma-api` Python wrapper — https://github.com/lucasheld/uptime-kuma-api
- Prometheus Blackbox Exporter releases — https://github.com/prometheus/blackbox_exporter (v0.24.0 confirmed)
- Prometheus Blackbox Exporter configuration reference — https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Bash Reference Manual — Parameter Expansion (`${var%%pattern}`, `${var##pattern}`) and `/dev/tcp` redirection
- NodeSource Node.js binary distribution — https://deb.nodesource.com
- Prometheus alerting rules / PromQL docs — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Broken URL parsing in `uptime-check.sh`.** The script used `:` as a field separator in the `SERVICES` array and then ran `URL="${service_def%%:*}"` to extract the URL. Because `%%` strips the *longest* match from the end, `https://example.com:Example Website` resolved to just `https`, so every HTTPS check would fail. I verified this in a shell (`URL: https`). Fix: switched the separator to `|` (which never appears in URLs) and updated the `%%` / `##` expansions accordingly. Added a short comment explaining the choice.
2. **Fabricated Uptime Kuma REST API.** The original section showed `POST /api/v1/login` and `POST /api/v1/monitors` endpoints with bearer-token auth. These endpoints do not exist in Uptime Kuma — the project uses Socket.IO for all UI/management traffic and only exposes a small number of REST endpoints (push monitor heartbeats, status pages, Prometheus metrics, status-page data). Followed up by checking the official wiki and the well-known community wrapper. Fix: replaced the section with an accurate description — Uptime Kuma has no official REST API for monitor CRUD — and showed (a) the community `lucasheld/uptime-kuma-api` Python wrapper for programmatic monitor creation and (b) the genuine `GET /api/push/<token>` heartbeat endpoint for push monitors. Renamed the heading from "via API" to "Programmatically" to match the reality.

## Review Notes
- The Uptime Kuma systemd unit sets `Environment=UPTIME_KUMA_PORT=3001`. This is correct per the wiki, which lists `UPTIME_KUMA_PORT` as the preferred name (the legacy `PORT` is also accepted).
- `DATA_DIR` is the correct env var name for Uptime Kuma's data directory.
- The NodeSource `setup_18.x` script is still functional, but Node.js 18 has reached end-of-life (April 2025). Node.js 20 LTS or 22 LTS would be a better choice for new installs. Left as-is because Uptime Kuma still supports Node 18 and this is a style/recency note, not a correctness bug.
- Blackbox Exporter v0.24.0 exists and the configuration schema (`prober`, `valid_status_codes`, `tls_config.insecure_skip_verify`, `dns.query_name`, etc.) matches the upstream reference. Newer releases (0.25.x, 0.26.x) exist; the pinned version still works.
- The Blackbox Exporter systemd unit runs as `User=nobody`. ICMP probes require `CAP_NET_RAW` (or running as root). The unit does not grant this capability, so the `icmp` module in the config will fail unless the binary is given `setcap cap_net_raw+ep` or the unit is updated with `AmbientCapabilities=CAP_NET_RAW`. The post does not actually invoke the ICMP module, so this is a latent issue rather than an immediate error — flagging for future improvement.
- The Prometheus alert rules use valid PromQL and standard Blackbox Exporter metric names (`probe_success`, `probe_ssl_earliest_cert_expiry`, `probe_duration_seconds`). All correct.
- The `/dev/tcp/HOST/PORT` redirection in the TCP check script is a Bash built-in (not netcat, despite the comment referring to "nc"); the comment is slightly misleading but the code itself is correct.
