# Validation Summary: How to Monitor Nginx IPv4 Connections with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Nginx (stub_status module)
- nginx-prometheus-exporter
- Prometheus (scrape configuration, alerting rules, relabel_configs)
- Grafana (dashboards, alerting)
- PromQL
- Docker
- systemd

## Sources Consulted
- nginx-prometheus-exporter README (https://github.com/nginx/nginx-prometheus-exporter) — verified exposed metric names and CLI flags (`--nginx.scrape-uri`, `--web.listen-address`)
- Nginx stub_status module documentation (https://nginx.org/en/docs/http/ngx_http_stub_status_module.html) — verified output format and directive syntax
- Prometheus alerting rules documentation (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- Prometheus relabel_configs documentation (https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)

## Issues Found
- The "Grafana alert rule" YAML in Step 5 (Connection Trends Alert Panel) used a top-level `rule:` key, which is neither a valid Grafana alert provisioning format nor a valid Prometheus alerting rule format. Replaced it with a properly structured Prometheus alerting rule using `groups[].rules[]` and a named alert (`NginxHighActiveConnections`). Updated the comment from "Grafana alert rule" to "Prometheus alerting rule" since the metric source is Prometheus and this format is the standard way to define such alerts.

## Review Notes
- The metric list in Step 4 is accurate but not exhaustive. The exporter also exposes `nginx_connections_accepted`, `nginx_connections_handled`, and `nginx_up`. The post doesn't claim its list is complete, so this is informational only.
- The `stub_status on;` syntax is the older form; modern Nginx documentation uses `stub_status;` (no argument), but both forms remain accepted by the parser, so no change required.
- The default scrape URI baked into nginx-prometheus-exporter is `/stub_status`; the post uses a custom `/nginx_status` location and matches the exporter's `--nginx.scrape-uri` flag accordingly, which is correct.
- The `relabel_configs` approach used to add an `ip_version` label is functionally correct, though using `static_configs[].labels` would be the more idiomatic way to attach a static label to a target.
- The Grafana community dashboard ID 9614 referenced in the Best Practices section is a valid published dashboard for nginx-prometheus-exporter.
- `curl -X POST http://localhost:9090/-/reload` requires Prometheus to be started with `--web.enable-lifecycle`; this is a common gotcha but not a technical error in the post.
