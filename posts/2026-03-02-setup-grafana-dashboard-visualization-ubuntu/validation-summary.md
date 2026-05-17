# Validation Summary: How to Set Up Grafana for Dashboard Visualization on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana (server, HTTP API, grafana-cli, provisioning, unified alerting)
- Ubuntu (APT package management)
- Prometheus (data source, PromQL)
- Node Exporter (community dashboard ID 1860)
- Nginx (reverse proxy)
- Let's Encrypt / Certbot (TLS)
- systemd (service management)

## Sources Consulted
- Grafana install on Debian/Ubuntu: https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/
- Grafana GPG key rotation (Aug 2023): https://grafana.com/blog/2023/08/24/grafana-security-update-gpg-signing-key-rotation/
- Grafana grafana.ini configuration reference: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- HTTP API — Dashboard: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- HTTP API — Data Source: https://grafana.com/docs/grafana/latest/developers/http_api/data_source/
- HTTP API — Admin: https://grafana.com/docs/grafana/latest/developers/http_api/admin/
- HTTP API — Alerting Provisioning: https://grafana.com/docs/grafana/latest/developers/http_api/alerting_provisioning/
- Provisioning (file-based): https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Node Exporter Full dashboard: https://grafana.com/grafana/dashboards/1860

## Issues Found

1. **APT GPG key URL and filename were outdated.** The post used `https://apt.grafana.com/gpg.key` saved as `/etc/apt/keyrings/grafana.gpg`. Following the August 2023 key rotation, Grafana's official install docs now use `https://apt.grafana.com/gpg-full.key` (which bundles the old key + revocation certificate + new key) and store it as `/etc/apt/keyrings/grafana.asc` (ASCII-armored, matching the `.asc` extension expected by APT's `signed-by` for non-dearmored keys). Updated the `wget` command, removed the now-unnecessary `gpg --dearmor` pipeline, and updated the `signed-by=` path in the sources list entry.

2. **Dashboard import API call would not have worked.** The original example passed `{"dashboard": {"id": null}, ..., "gnetId": 1860}` to `POST /api/dashboards/import`. The `/api/dashboards/import` endpoint does not accept a `gnetId` field and does not fetch dashboards from grafana.com — it expects the full dashboard JSON model in the `dashboard` field (`gnetId` is only meaningful in file-based provisioning configs, which is a different mechanism). Rewrote the example to first `curl` the dashboard JSON from `https://grafana.com/api/dashboards/1860/revisions/latest/download` into a `DASHBOARD` variable, then post it as the body of the import call. Added a brief comment explaining why this two-step flow is necessary.

## Review Notes
- The `OrgId` field (capital O, capital I) in `POST /api/admin/users` looks unusual but is intentional and matches Grafana's official docs exactly. Left as-is.
- The custom dashboard creation example uses `"datasource": {"type": "prometheus", "uid": "prometheus"}`. The `uid` value should be the actual UID of the Prometheus datasource as auto-assigned by Grafana (or a UID set via provisioning); the literal string `"prometheus"` will only work coincidentally. This is a minor caveat in an illustrative example — left unchanged to preserve scope.
- "Configuration > Data Sources" navigation is the legacy path; Grafana 10+ moved this under "Connections > Data sources". Both still resolve, so left unchanged.
- `apt-transport-https` is a transitional package on current Ubuntu releases; it still works and remains in Grafana's official docs, so left unchanged.
- Notification policy `PUT /api/v1/provisioning/policies` correctly replaces the entire policy tree (it is a singleton resource). The body shape used is accurate.
- The email contact-point `subject` setting is supported and used correctly.
- Dashboard 1860 ("Node Exporter Full" by rfmoz) is confirmed as the popular Node Exporter dashboard.
