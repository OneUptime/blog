# Validation Summary: How to Monitor Certificate Health in Istio

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Istio
- Envoy
- Prometheus and PromQL
- Grafana
- Kubernetes
- Alertmanager
- Bash, jq, and OpenSSL

## Sources Consulted
- Istio pilot-discovery command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio proxy-config secret documentation: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio security troubleshooting for proxy certificate inspection: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio plug-in CA certificate documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio security FAQ for workload certificate lifetime: https://istio.io/latest/about/faq/security/
- Envoy server statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Envoy listener TLS statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The root CA expiry alert used `humanizeTimestamp` on the alert expression value, but the expression returns seconds remaining, not a Unix timestamp. Changed the annotation to use `humanizeDuration`.
- The Envoy metric `envoy_listener_ssl_handshake` was described as TLS handshake failures. Envoy documents `ssl.handshake` as successful TLS handshakes, while `ssl.connection_error` tracks TLS connection errors. Updated the metric descriptions and added `envoy_listener_ssl_connection_error`.
- The command for checking proxy stats used `curl` inside the `istio-proxy` container. Istio documents `pilot-agent request GET stats` for this use case. Updated the command.
- Root CA checks read `ca-cert.pem` from the `cacerts` secret, but Istio's plug-in CA secret uses `root-cert.pem` for the root certificate and `ca-cert.pem` for the intermediate/signing certificate. Updated the ad-hoc command and health-check script to prefer `root-cert.pem`, with a fallback for self-signed CA storage.
- The workload certificate extraction command could treat a missing jq result as `null` and try to base64-decode it. Updated the jq expression to return an empty string when the default secret is not present.
- The Alertmanager route example used deprecated `match` fields and the PagerDuty `service_key` field. Updated the example to use `matchers` and `routing_key`.

## Review Notes
The Istio `citadel_server_*` metrics are still documented in Istio 1.30, despite the historical Citadel naming. The PromQL examples assume Prometheus scrape labels such as `namespace` and `pod_name` are present; those labels depend on the Prometheus scrape configuration.
