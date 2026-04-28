# Validation Summary: How to Monitor Nginx IPv4 Connections with Prometheus and Grafana (2)

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Nginx (`ngx_http_stub_status_module`)
- nginx-prometheus-exporter (v0.11.0)
- Prometheus (scrape configs, alerting rules, PromQL)
- Grafana (dashboard panels)
- systemd

## Sources Consulted
- nginx-prometheus-exporter v0.11.0 README: https://github.com/nginxinc/nginx-prometheus-exporter/blob/v0.11.0/README.md
- nginx-prometheus-exporter v0.11.0 release assets: https://github.com/nginxinc/nginx-prometheus-exporter/releases/tag/v0.11.0
- Nginx `ngx_http_stub_status_module` documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Prometheus configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
No technical issues found.

Verified items:
- Repository path `github.com/nginxinc/nginx-prometheus-exporter` is correct (still resolves; this was the canonical org for v0.11.0).
- Release asset name `nginx-prometheus-exporter_0.11.0_linux_amd64.tar.gz` matches the published v0.11.0 release.
- CLI flags `-nginx.scrape-uri` and `-web.listen-address` (single-dash, Go `flag` package style) match the v0.11.0 usage documentation.
- All exported metric names used in the post (`nginx_up`, `nginx_connections_active`, `nginx_connections_accepted`, `nginx_connections_handled`, `nginx_connections_reading`, `nginx_connections_writing`, `nginx_connections_waiting`, `nginx_http_requests_total`) are documented in the v0.11.0 README under "Common metrics" / "Metrics for NGINX OSS".
- The `stub_status` directive and output format (`Active connections`, `server accepts handled requests`, `Reading/Writing/Waiting`) match the official `ngx_http_stub_status_module` documentation.
- Nginx server block syntax (listen on a specific IP+port, `allow`/`deny`, `server_name _`) is valid.
- systemd unit file is syntactically valid (Unit/Service/Install sections, `ExecStart`, `Restart=on-failure`, `WantedBy=multi-user.target`).
- Prometheus scrape config (`job_name`, `static_configs.targets`, `labels`, `scrape_interval`) is valid YAML and matches Prometheus configuration schema.
- PromQL expressions are syntactically correct, including the regex `instance=~"10\\.0\\.0\\..*:9113"` (escaped dots in YAML/double-quoted context).
- Alerting rule format (`groups[].name`, `rules[].alert/expr/for/labels/annotations`, template `{{ $labels.instance }}` / `{{ $value }}`) matches Prometheus alerting rules schema.

## Review Notes
- v0.11.0 was current at the time of writing but is now an older release; v1.x is available with mostly compatible flags and the same metric names, plus additional optional features. The post's content is still accurate for v0.11.0 specifically.
- The example IPs in the Nginx server block (`10.0.0.5`) differ from the Prometheus scrape targets (`10.0.0.1-3`); this is illustrative (showing a fleet of web servers), not an inconsistency in functionality.
- The comment "Connection handling rate (per second)" labels `rate(nginx_connections_accepted[5m])`, which is technically the *accept* rate; this is a minor wording nuance, not a technical error.
