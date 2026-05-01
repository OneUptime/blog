# Validation Summary: How to Deploy Prometheus via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Prometheus
- Prometheus alerting rules and PromQL
- Alertmanager

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation: How Relative Path Support works in Portainer — https://docs.portainer.io/advanced/relative-paths
- Prometheus Documentation: Configuration — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Documentation: `prometheus` command-line flags — https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus Documentation: Management API — https://prometheus.io/docs/prometheus/latest/management_api/
- Prometheus Documentation: Security model — https://prometheus.io/docs/operating/security/
- Prometheus Documentation: `promtool` command-line reference — https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus source Dockerfile — https://github.com/prometheus/prometheus/blob/main/Dockerfile
- Alertmanager Documentation: Configuration — https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager Documentation: Management API — https://prometheus.io/docs/alerting/latest/management_api/
- Alertmanager source Dockerfile — https://github.com/prometheus/alertmanager/blob/main/Dockerfile
- Alertmanager config loader source — https://github.com/prometheus/alertmanager/blob/main/config/config.go

## Issues Found

1. **Relative bind mounts were misleading for a basic Portainer stack deployment.** The post used `./prometheus.yml`, `./rules`, and `./alertmanager.yml`, but Portainer documents repo-relative volume paths as a Git-backed relative-path feature. I replaced them with explicit host-path placeholders so the stack instructions match a normal Portainer stack deployment.

2. **Prometheus retention was configured with deprecated CLI flags.** The stack used `--storage.tsdb.retention.time` and `--storage.tsdb.retention.size`, which Prometheus now documents as deprecated. I moved retention settings into the current `storage.tsdb.retention` section in `prometheus.yml`.

3. **The stack enabled the Prometheus admin API unnecessarily.** The post only uses `/-/reload`, which requires `--web.enable-lifecycle`, not `--web.enable-admin-api`. Prometheus documents the admin API as exposing mutating endpoints such as delete-series operations, so I removed the flag.

4. **The healthcheck depended on `curl` instead of the tooling bundled in the official image.** The official Prometheus image is built from Prometheus' BusyBox base image and includes `promtool`. I replaced the `curl`-based shell healthcheck with `promtool check healthy --url http://localhost:9090`.

5. **The Alertmanager routing tree referenced an undefined receiver.** The route sent critical alerts to `pagerduty`, but no receiver with that name existed. I added the missing `pagerduty` receiver with a valid `pagerduty_configs` block.

6. **The Alertmanager secrets placeholders would not be interpolated as written.** The example used `${SMTP_PASSWORD}` and `${SLACK_WEBHOOK_URL}` inside `alertmanager.yml`, but Alertmanager's config loader reads the YAML file directly and does not perform environment-variable interpolation on that file. I replaced them with literal placeholder values and added `auth_username`, which is required for the Gmail SMTP example shown.

7. **The validation command assumed a container name that is not guaranteed.** The original `docker exec prometheus ...` example only works if the container is explicitly named `prometheus`, which the stack does not do. I changed the command to use a `<prometheus-container-name>` placeholder and the explicit `/bin/promtool` path.

## Review Notes
- The `node-exporter`, `cadvisor`, and `myapp` scrape targets are valid examples, but they will only resolve if those services are reachable from the Prometheus container on the relevant Docker network.
- The post still uses `prom/prometheus:latest` and `prom/alertmanager:latest`. That is valid, but pinning specific versions would make the guide more reproducible over time.
