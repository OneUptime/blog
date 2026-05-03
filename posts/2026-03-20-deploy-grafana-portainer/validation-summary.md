# Validation Summary: How to Deploy Grafana via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Grafana (official Docker image)
- Portainer (Stacks)
- Docker Compose
- Grafana provisioning (datasources and dashboards)
- Prometheus (data source)
- Loki (data source)
- InfluxDB v2 (data source, Flux)
- Alertmanager
- Grafana Alerting (PromQL alert rule)
- Grafana plugins (`GF_INSTALL_PLUGINS`)
- SMTP configuration (`GF_SMTP_*`)

## Sources Consulted
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Docker installation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana Configure Docker image: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Grafana configuration env vars convention `GF_<Section>_<Key>` (e.g. `GF_SECURITY_ADMIN_PASSWORD`, `GF_SERVER_ROOT_URL`, `GF_USERS_ALLOW_SIGN_UP`, `GF_SMTP_*`)
- Grafana health endpoint `/api/health` (default port 3000)
- Node Exporter Full community dashboard (ID 1860): https://grafana.com/grafana/dashboards/1860
- Docker Compose reference (volumes, healthcheck, restart policies)

## Issues Found
No technical issues found. Verified items:
- Docker image `grafana/grafana:latest` is the correct official image.
- Default port `3000` and health endpoint `/api/health` are correct.
- Data path `/var/lib/grafana` and provisioning path `/etc/grafana/provisioning` match the official image.
- Provisioning files use `apiVersion: 1` with the correct `datasources` and `providers` structure.
- InfluxDB datasource uses correct `jsonData` (`version: Flux`, `organization`, `defaultBucket`) and `secureJsonData.token` for v2.
- Environment variables `GF_SECURITY_ADMIN_USER`, `GF_SECURITY_ADMIN_PASSWORD`, `GF_USERS_ALLOW_SIGN_UP`, `GF_SERVER_ROOT_URL`, `GF_SMTP_*`, and `GF_INSTALL_PLUGINS` follow the `GF_<Section>_<Key>` naming convention.
- PromQL alert query `avg(rate(http_requests_total{status!="200"}[5m])) > 0.1` is syntactically valid.
- Compose v3.8 spec, named volume `grafana_data`, and bind-mounted `./grafana-provisioning` are valid.

## Review Notes
- `GF_INSTALL_PLUGINS` still works as the runtime env var to install plugins on container start. Grafana has introduced `GF_PLUGINS_PREINSTALL` as a newer alternative; either is acceptable today.
- `grafana-worldmap-panel` is deprecated in favor of the built-in Geomap panel, but it remains installable. Readers building new dashboards may prefer Geomap going forward.
- The healthcheck uses `curl`; recent `grafana/grafana` Alpine images include `curl`, so this works, but `wget --spider` is a common alternative if curl is ever stripped from a future image.
- Pinning `grafana/grafana:latest` is convenient for a tutorial but a fixed tag (e.g. `grafana/grafana:11.x.y`) is preferable in production for reproducibility.
- The Node Exporter Full download URL pins revision 36; using `/revisions/latest/download` would always fetch the newest revision, but the pinned form is also valid and more reproducible.
