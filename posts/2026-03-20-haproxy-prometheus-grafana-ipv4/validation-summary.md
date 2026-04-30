# Validation Summary: How to Monitor HAProxy IPv4 Metrics with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HAProxy
- Prometheus
- Grafana
- PromQL
- YAML configuration

## Sources Consulted
- HAProxy Prometheus metrics tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/prometheus/
- HAProxy Configuration Manual (`mode`, default TCP mode, `http-request use-service`, `fullconn`): https://docs.haproxy.org/2.8/configuration.html
- Prometheus configuration reference (`scrape_configs`, `metrics_path`, `scrape_interval`): https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus operators reference (vector matching rules for the HTTP error-rate query): https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The sample `main_http` frontend and `app_servers` backend were missing `mode http`. HAProxy defaults proxies to TCP mode, so the post's HTTP request and response metrics would not be available as written. Added `mode http` to both sections.
- `haproxy_server_up`, `haproxy_backend_queue_current`, and `haproxy_frontend_requests_total` do not match the native HAProxy exporter's metric names. Replaced them with `haproxy_server_status`, `haproxy_backend_current_queue`, and `haproxy_frontend_http_requests_total`.
- The HTTP error-rate query divided a metric segmented by `code` labels by a metric without that label. In PromQL, the default vector matching would not produce the intended per-frontend ratio. Updated the expression to aggregate both sides `by (proxy)` before division.
- The "Connection pool saturation" example used `haproxy_backend_limit_sessions`, which maps to backend `fullconn` rather than a simple backend pool limit and was not reliably meaningful in the sample configuration. Replaced it with a direct backend session load query.
- The `HAProxyBackendDown` alert referenced the nonexistent `haproxy_server_up` metric and mixed backend naming with per-server labeling. Updated it to alert on `haproxy_backend_active_servers == 0`, which matches the alert name and annotation.

## Review Notes
- HAProxy's native Prometheus exporter is available starting in HAProxy 2.0, but HAProxy 2.0 itself is EOL. Readers should use a currently supported HAProxy release.
- The alert rules file snippet is syntactically valid, but Prometheus still needs a corresponding `rule_files` entry in `prometheus.yml` to load it.
- `haproxy` and `promtool` were not installed in this workspace, so syntax verification relied on the official documentation above rather than local binary checks.
