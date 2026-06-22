# Validation Summary: How to Secure Loki with Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- NGINX reverse proxy
- HTTP Basic Authentication
- OAuth2 Proxy and OIDC
- Promtail
- Grafana data source provisioning
- Fluent Bit Loki output
- Kubernetes kubectl secrets
- TLS

## Sources Consulted
- Grafana Loki authentication documentation: https://grafana.com/docs/loki/latest/operations/authentication/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki multi-tenancy documentation: https://grafana.com/docs/loki/latest/operations/multi-tenancy/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Promtail configuration reference: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- NGINX Basic Auth module documentation: https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html
- NGINX auth_request module documentation: https://nginx.org/en/docs/http/ngx_http_auth_request_module.html
- NGINX HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- OAuth2 Proxy configuration reference: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Apache `htpasswd` documentation: https://httpd.apache.org/docs/2.4/programs/htpasswd.html
- Kubernetes `kubectl create secret` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret/

## Issues Found
- The NGINX examples used `listen 443 ssl http2;` while the Docker Compose example pins `nginx:1.25`. NGINX 1.25.1 introduced the separate `http2 on;` directive, so the snippets were updated to `listen 443 ssl;` plus `http2 on;`.
- The first NGINX example set the `Connection` header twice in the query location and always sent `upgrade`. Added an HTTP-level `map` and used `$connection_upgrade` so normal requests and WebSocket tail requests are handled correctly.
- The Promtail examples used `${...}` environment variables without noting that Promtail only expands them when started with `-config.expand-env=true`. Added inline comments to the affected snippets.
- The Loki multi-tenant example included `enforce_metric_name`, which is no longer present in the current Loki configuration reference, and used deprecated `per_tenant_override_config`. Removed `enforce_metric_name` and replaced the deprecated override setting with `runtime_config.file`.

## Review Notes
Promtail is now end-of-life as of March 2, 2026 according to Grafana documentation. The Promtail snippets remain technically valid for existing installations, but future revisions should prefer Grafana Alloy examples.
