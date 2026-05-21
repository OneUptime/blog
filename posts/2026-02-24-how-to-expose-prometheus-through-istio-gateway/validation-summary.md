# Validation Summary: How to Expose Prometheus Through Istio Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Gateway and VirtualService
- Istio AuthorizationPolicy and RequestAuthentication
- Prometheus HTTP API, management API, and admin API
- cert-manager Certificate resources
- Kubernetes kubectl and TLS Secrets
- Grafana Prometheus data sources
- PromQL and Istio standard metrics

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio ingress access control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus management API: https://prometheus.io/docs/prometheus/latest/management_api/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus HTTPS and authentication configuration: https://prometheus.io/docs/prometheus/latest/configuration/https/
- Prometheus security model: https://prometheus.io/docs/operating/security/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Grafana Prometheus data source configuration: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/

## Issues Found
- The post said Prometheus has no built-in authentication. Prometheus supports basic authentication and TLS through its web configuration, though many default deployments do not enable it. Updated the statement to distinguish Prometheus capability from common deployment defaults.
- The IP allow-list example used `remoteIpBlocks` without mentioning that Istio needs gateway network topology configuration, such as `numTrustedProxies`, when deriving the original client IP from `X-Forwarded-For` or PROXY protocol. Added that caveat and noted when `ipBlocks` is appropriate.
- The admin endpoint section implied `/api/v1/admin` endpoints are always active. Prometheus administrative HTTP APIs are disabled by default and require `--web.enable-admin-api`. Updated the wording.
- The "Adding Rate Limiting" section only configured a VirtualService timeout, which is not rate limiting. Renamed the section to query timeouts and clarified that true rate limiting requires Istio's external rate limit integration.
- The latency PromQL example described a 95th percentile as an average and did not aggregate histogram buckets. Updated the label and query to use `sum(rate(..._bucket[5m])) by (le)` inside `histogram_quantile`.

## Review Notes
The Istio API versions used in the examples are current. The certificate, Gateway, VirtualService, AuthorizationPolicy, RequestAuthentication, kubectl, curl, Prometheus API, and Grafana data source examples are otherwise technically plausible, assuming the sample namespaces, hostnames, issuer, gateway labels, and service names match the reader's cluster.
