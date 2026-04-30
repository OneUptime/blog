# Validation Summary: How to Monitor HAProxy and Nginx on IPv4 with Prometheus and Grafana

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- Nginx
- nginx-prometheus-exporter
- Prometheus
- Grafana
- Docker
- Docker Compose
- PromQL

## Sources Consulted
- HAProxy Prometheus metrics tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/prometheus/
- HAProxy 2.8 configuration manual (`mode` defaults to TCP unless set to HTTP): https://docs.haproxy.org/2.8/configuration.html
- NGINX `ngx_http_stub_status_module` documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- NGINX Prometheus exporter repository and CLI/metrics reference: https://github.com/nginx/nginx-prometheus-exporter
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Docker host network driver reference: https://docs.docker.com/engine/network/drivers/host/
- Docker Compose service reference: https://docs.docker.com/reference/compose-file/services/
- Grafana Prometheus data source documentation: https://grafana.com/docs/learning-paths/prometheus/add-data-source/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/dashboards/export-import/
- Grafana dashboard page for HAProxy ID `12693`: https://grafana.com/grafana/dashboards/12693-haproxy/
- Grafana dashboard page for Nginx ID `10393`: https://grafana.com/grafana/dashboards/10393-nginx/
- NGINX Docker image documentation: https://hub.docker.com/_/nginx

## Issues Found
- The HAProxy example omitted `mode http` on the application frontend and backend. HAProxy defaults to TCP mode, so the post would not reliably produce the HTTP-specific metrics used later. I added `mode http` to both sections.
- The Nginx `stub_status` example used the older `stub_status on;` form. Current documentation uses `stub_status;`, so I updated the config to the current syntax.
- The `nginx-prometheus-exporter` examples used single-dash flags such as `-nginx.scrape-uri` and `-web.listen-address`. The documented flags are `--nginx.scrape-uri` and `--web.listen-address`, so I corrected both the `docker run` and Compose examples.
- The Prometheus rules file was never loaded. I added `rule_files` to `prometheus.yml` and mounted `alert_rules.yml` into the Prometheus container examples so the alerting section actually works.
- The Compose stack referenced an `nginx` dependency that did not exist and could not scrape Nginx as written. I added an `nginx` service and aligned the Compose wiring with the host-network exporter pattern already used earlier in the post.
- The HAProxy backend error-rate query was PromQL-incorrect because it divided label-mismatched vectors and effectively compared `5xx` to `5xx`, not `5xx` to total responses. I fixed it by aggregating numerator and denominator with `sum by (proxy)`.
- The HAProxy server-health query and alert ignored the `state` label on `haproxy_server_status`. That metric emits one series per state, so the original examples would be misleading or alert incorrectly. I changed the query to `state="UP"` and the alert to `state="DOWN"`.
- The Nginx metrics section used `nginx_connections_failed_total`, which is not exported by `nginx/nginx-prometheus-exporter` for OSS `stub_status`. I replaced the invalid examples with supported metrics such as accepted and waiting connections.
- The post claimed Nginx metrics in this setup would cover latency and request status breakdowns, but the OSS `stub_status` exporter only exposes basic request and connection counters. I corrected the description and conclusion to reflect the actual scope of the exporter.
- The Grafana UI path and dashboard IDs were outdated. I updated the data-source navigation to the current `Connections -> Data sources` flow and replaced the dashboard IDs with currently published Grafana dashboard pages that match the documented exporters.

## Review Notes
- The Docker examples for the Nginx exporter and Compose use host networking. Docker documents host networking as Linux-only on Docker Engine and as an opt-in feature on Docker Desktop 4.34 and later.
- Nginx OSS `stub_status` does not expose per-status response codes or latency metrics. Those require a different telemetry approach, such as NGINX Plus API metrics or log-based/request instrumentation.
- Grafana community dashboard IDs can change over time. The updated IDs were valid on April 30, 2026, based on the Grafana dashboard library pages above.
