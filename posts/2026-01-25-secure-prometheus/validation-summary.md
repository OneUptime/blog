# Validation Summary: How to Secure Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- Prometheus web configuration
- Prometheus scrape configuration and relabeling
- TLS and mutual TLS
- Basic authentication
- Grafana datasource provisioning
- Kubernetes NetworkPolicy
- Kubernetes RBAC
- NGINX reverse proxy and rate limiting
- iptables
- OpenSSL
- Prometheus alerting rules and PromQL

## Sources Consulted
- Prometheus HTTPS and authentication documentation: https://prometheus.io/docs/prometheus/latest/configuration/https/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus management API documentation: https://prometheus.io/docs/prometheus/latest/management_api/
- Prometheus source code for built-in metrics: https://github.com/prometheus/prometheus
- Grafana datasource provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- NGINX request limiting documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- NGINX HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- OpenSSL local command documentation/version check: `openssl version`

## Issues Found
- The Grafana datasource example defined `secureJsonData` twice. I merged `basicAuthPassword` and `tlsCACert` under one `secureJsonData` map because duplicate YAML keys can overwrite earlier values and lose the basic-auth password.
- The Kubernetes NetworkPolicy comment said Alertmanager would "receive alerts" through an ingress rule to Prometheus on port 9090. I changed the comment to say Alertmanager can query Prometheus if needed, because Prometheus sends alerts to Alertmanager rather than Alertmanager receiving them through Prometheus ingress.
- The NGINX example placed `limit_req_zone` inside the `server` block. I moved it to the HTTP-level snippet context because NGINX documents `limit_req_zone` as valid only in the `http` context.
- The NGINX example used `listen 443 ssl http2`. I updated it to `listen 443 ssl;` plus `http2 on;`, matching the current NGINX HTTP/2 directive form.
- The relabeling example claimed to hash an email value but only replaced it with the literal string `hashed`. I changed the comment to describe it as replacing sensitive values with a placeholder.
- The config reload alert used `increase(prometheus_config_last_reload_successful[5m])`, but that metric is a 0/1 success gauge, not a reload counter. I changed it to watch `changes(prometheus_config_last_reload_success_timestamp_seconds[5m]) > 0`.
- The unauthorized scrape alert used `prometheus_target_scrape_pools_failed_total`, which was not an appropriate/current metric for detecting unauthorized scrape attempts. I changed the alert to `TargetScrapeFailures` using `up == 0`, with wording that directs readers to check TLS or authentication errors.

## Review Notes
- Prometheus native web TLS and basic authentication support remains documented as experimental by Prometheus.
- The security examples are intentionally illustrative. Production deployments should adapt NetworkPolicies, DNS rules, RBAC permissions, certificate names, and alert thresholds to their actual cluster labels, scrape targets, and Prometheus version.
